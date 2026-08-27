package finance

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	txns      *TransactionStore
	cats      *CategoryStore
	budgets   *BudgetStore
	reports   *ReportStore
	recurring *RecurringTransactionStore
	publisher *Publisher
}

func NewHandlers(txns *TransactionStore, cats *CategoryStore, budgets *BudgetStore, reports *ReportStore, recurring *RecurringTransactionStore, publisher *Publisher) *Handlers {
	return &Handlers{txns: txns, cats: cats, budgets: budgets, reports: reports, recurring: recurring, publisher: publisher}
}

func (h *Handlers) RegisterRoutes(r gin.IRouter) {
	txns := r.Group("/finance/transactions")
	txns.POST("", h.CreateTransaction)
	txns.GET("", h.ListTransactions)
	txns.PUT("/:id", h.UpdateTransaction)
	txns.DELETE("/:id", h.DeleteTransaction)

	cats := r.Group("/finance/categories")
	cats.GET("", h.ListCategories)
	cats.POST("", h.CreateCategory)
	cats.PATCH("/:id", h.PatchCategory)

	budgets := r.Group("/finance/budgets")
	budgets.GET("", h.ListBudgets)
	budgets.POST("", h.CreateBudget)
	budgets.PATCH("/:id", h.PatchBudget)

	reports := r.Group("/finance/reports")
	reports.GET("/monthly", h.MonthlyReport)
	reports.GET("/categories", h.CategoryReport)
	reports.GET("/trend", h.TrendReport)
	reports.GET("/vehicle-cost", h.VehicleCostReport)
	reports.GET("/vehicle-breakdown", h.VehicleBreakdownReport)

	recurring := r.Group("/finance/recurring")
	recurring.POST("", h.CreateRecurring)
	recurring.GET("", h.ListRecurring)
	recurring.DELETE("/:id", h.DeleteRecurring)
}

func userID(c *gin.Context) (string, bool) {
	id := c.GetHeader("X-User-Id")
	if id == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id header"})
		return "", false
	}
	return id, true
}

func (h *Handlers) afterTransactionWrite(t Transaction) {
	afterTransactionWrite(h.publisher, h.budgets, t)
}

// afterTransactionWrite publishes finance.transaction.added and, if the write pushed the
// transaction's category over a new budget threshold this month, finance.budget.exceeded.
// The two are independent — a RabbitMQ publish failure must not skip the (DB-only) threshold
// check, and vice versa. Standalone (not a *Handlers method) so the recurring-transaction
// scanner can call it too without needing a full Handlers instance.
func afterTransactionWrite(publisher *Publisher, budgets *BudgetStore, t Transaction) {
	if err := publisher.PublishTransactionAdded(t); err != nil {
		log.Printf("failed to publish finance.transaction.added for transaction %s: %v", t.ID, err)
	}

	month := t.OccurredAt.Format("2006-01")
	crossing, err := budgets.CheckThreshold(context.Background(), t.UserID, t.Category, month)
	if err != nil {
		log.Printf("failed to check budget threshold for %s/%s/%s: %v", t.UserID, t.Category, month, err)
		return
	}
	if crossing == nil {
		return
	}
	if err := publisher.PublishBudgetExceeded(*crossing); err != nil {
		log.Printf("failed to publish finance.budget.exceeded: %v", err)
	}
}

func (h *Handlers) CreateTransaction(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in TransactionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	t, err := h.txns.Create(c.Request.Context(), uid, in, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transaction"})
		return
	}
	go h.afterTransactionWrite(*t)
	c.JSON(http.StatusCreated, t)
}

func (h *Handlers) ListTransactions(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	filter := TransactionFilter{Category: c.Query("category")}
	if from := parseDateQuery(c.Query("from")); from != nil {
		filter.From = from
	}
	if to := parseDateQuery(c.Query("to")); to != nil {
		filter.To = to
	}

	list, err := h.txns.List(c.Request.Context(), uid, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list transactions"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(list))
}

func (h *Handlers) UpdateTransaction(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in TransactionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	t, err := h.txns.Update(c.Request.Context(), c.Param("id"), uid, in)
	if err != nil {
		if errors.Is(err, ErrTransactionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update transaction"})
		return
	}
	go h.afterTransactionWrite(*t)
	c.JSON(http.StatusOK, t)
}

func (h *Handlers) DeleteTransaction(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	if err := h.txns.Delete(c.Request.Context(), c.Param("id"), uid); err != nil {
		if errors.Is(err, ErrTransactionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete transaction"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handlers) CreateRecurring(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in RecurringTransactionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rt, first, err := h.recurring.Create(c.Request.Context(), uid, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create recurring transaction"})
		return
	}
	go h.afterTransactionWrite(*first)
	c.JSON(http.StatusCreated, rt)
}

func (h *Handlers) ListRecurring(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	list, err := h.recurring.List(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list recurring transactions"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(list))
}

func (h *Handlers) DeleteRecurring(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	if err := h.recurring.Delete(c.Request.Context(), c.Param("id"), uid); err != nil {
		if errors.Is(err, ErrRecurringNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "recurring transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete recurring transaction"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handlers) ListCategories(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	includeArchived := c.Query("include_archived") == "true"
	list, err := h.cats.List(c.Request.Context(), uid, includeArchived)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list categories"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(list))
}

func (h *Handlers) CreateCategory(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in CategoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cat, err := h.cats.Create(c.Request.Context(), uid, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create category"})
		return
	}
	c.JSON(http.StatusCreated, cat)
}

func (h *Handlers) PatchCategory(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in CategoryPatch
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cat, err := h.cats.Patch(c.Request.Context(), c.Param("id"), uid, in)
	if err != nil {
		if errors.Is(err, ErrCategoryNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "category not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update category"})
		return
	}
	c.JSON(http.StatusOK, cat)
}

func (h *Handlers) ListBudgets(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	month := monthOrDefault(c)
	list, err := h.budgets.List(c.Request.Context(), uid, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list budgets"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(list))
}

func (h *Handlers) CreateBudget(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in BudgetInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	b, err := h.budgets.Create(c.Request.Context(), uid, in)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create budget"})
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *Handlers) PatchBudget(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	var in BudgetPatch
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	b, err := h.budgets.Patch(c.Request.Context(), c.Param("id"), uid, in)
	if err != nil {
		if errors.Is(err, ErrBudgetNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "budget not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update budget"})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *Handlers) MonthlyReport(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	report, err := h.reports.Monthly(c.Request.Context(), uid, monthOrDefault(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build monthly report"})
		return
	}
	c.JSON(http.StatusOK, report)
}

func (h *Handlers) CategoryReport(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	breakdown, err := h.reports.CategoryBreakdown(c.Request.Context(), uid, monthOrDefault(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build category breakdown"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(breakdown))
}

func (h *Handlers) TrendReport(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	trend, err := h.reports.Trend(c.Request.Context(), uid, monthOrDefault(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build trend report"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(trend))
}

func (h *Handlers) VehicleCostReport(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	report, err := h.reports.VehicleCost(c.Request.Context(), uid, monthOrDefault(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build vehicle cost report"})
		return
	}
	c.JSON(http.StatusOK, report)
}

func (h *Handlers) VehicleBreakdownReport(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	breakdown, err := h.reports.VehicleBreakdown(c.Request.Context(), uid, monthOrDefault(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build vehicle breakdown report"})
		return
	}
	c.JSON(http.StatusOK, orEmpty(breakdown))
}

func monthOrDefault(c *gin.Context) string {
	if m := c.Query("month"); m != "" {
		return m
	}
	return time.Now().UTC().Format("2006-01")
}

func parseDateQuery(raw string) *time.Time {
	if raw == "" {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return &t
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return &t
	}
	return nil
}

// orEmpty ensures list endpoints return `[]` instead of `null` when there are no rows —
// nil slices marshal to JSON null, which is awkward for mobile clients to handle uniformly.
func orEmpty[T any](list []T) []T {
	if list == nil {
		return []T{}
	}
	return list
}
