package vehicle

import (
	"errors"
	stdlog "log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handlers struct {
	store            *Store
	fuelStore        *FuelStore
	maintenanceStore *MaintenanceStore
	expenseStore     *ExpenseStore
	reminderStore    *ReminderStore
	analyticsStore   *AnalyticsStore
	dataStore        *DataStore
	publisher        *Publisher
}

func NewHandlers(store *Store, fuelStore *FuelStore, maintenanceStore *MaintenanceStore, expenseStore *ExpenseStore, reminderStore *ReminderStore, analyticsStore *AnalyticsStore, dataStore *DataStore, publisher *Publisher) *Handlers {
	return &Handlers{
		store:            store,
		fuelStore:        fuelStore,
		maintenanceStore: maintenanceStore,
		expenseStore:     expenseStore,
		reminderStore:    reminderStore,
		analyticsStore:   analyticsStore,
		dataStore:        dataStore,
		publisher:        publisher,
	}
}

func (h *Handlers) RegisterRoutes(r gin.IRouter) {
	vehicles := r.Group("/vehicle/vehicles")
	vehicles.POST("", h.Create)
	vehicles.GET("", h.List)
	vehicles.GET("/:id", h.Get)
	vehicles.PUT("/:id", h.Update)
	vehicles.DELETE("/:id", h.Delete)
	vehicles.POST("/:id/primary", h.SetPrimary)
	vehicles.POST("/:id/fuel", h.CreateFuelLog)
	vehicles.GET("/:id/fuel", h.ListFuelLogs)
	vehicles.POST("/:id/maintenance", h.CreateMaintenanceLog)
	vehicles.GET("/:id/maintenance", h.ListMaintenanceLogs)
	vehicles.POST("/:id/expenses", h.CreateExpense)
	vehicles.GET("/:id/expenses", h.ListExpenses)
	vehicles.POST("/:id/reminders", h.CreateReminder)
	vehicles.GET("/:id/reminders", h.ListReminders)
	vehicles.GET("/:id/analytics/cost-of-ownership", h.CostOfOwnership)
	vehicles.GET("/:id/analytics/monthly-breakdown", h.MonthlyBreakdown)
	vehicles.GET("/:id/analytics/efficiency-trend", h.EfficiencyTrend)

	r.DELETE("/vehicle/fuel/:id", h.DeleteFuelLog)
	r.DELETE("/vehicle/maintenance/:id", h.DeleteMaintenanceLog)
	r.DELETE("/vehicle/expenses/:id", h.DeleteExpense)
	r.PUT("/vehicle/reminders/:id", h.UpdateReminder)
	r.DELETE("/vehicle/reminders/:id", h.DeleteReminder)
	r.GET("/vehicle/analytics/compare", h.CompareVehicles)

	r.DELETE("/vehicle/data", h.ClearAllData)
}

type vehicleRequest struct {
	Make        string  `json:"make"`
	Model       string  `json:"model"`
	Year        int     `json:"year"`
	PlateNumber string  `json:"plate_number"`
	FuelType    string  `json:"fuel_type"`
	Odometer    float64 `json:"odometer"`
	PhotoURL    string  `json:"photo_url"`
}

func userID(c *gin.Context) (string, bool) {
	id := c.GetHeader("X-User-Id")
	if id == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-Id header"})
		return "", false
	}
	return id, true
}

func (h *Handlers) Create(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	var req vehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if req.Make == "" || req.Model == "" || req.PlateNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "make, model, and plate_number are required"})
		return
	}

	v, err := h.store.Create(c.Request.Context(), uuid.NewString(), Vehicle{
		UserID:      uid,
		Make:        req.Make,
		Model:       req.Model,
		Year:        req.Year,
		PlateNumber: req.PlateNumber,
		FuelType:    req.FuelType,
		Odometer:    req.Odometer,
		PhotoURL:    req.PhotoURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create vehicle"})
		return
	}
	c.JSON(http.StatusCreated, v)
}

func (h *Handlers) List(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	vehicles, err := h.store.ListByUser(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list vehicles"})
		return
	}
	c.JSON(http.StatusOK, vehicles)
}

func (h *Handlers) Get(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	v, err := h.store.GetByID(c.Request.Context(), uid, c.Param("id"))
	if err != nil {
		respondStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handlers) Update(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	var req vehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if req.Make == "" || req.Model == "" || req.PlateNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "make, model, and plate_number are required"})
		return
	}

	v, err := h.store.Update(c.Request.Context(), uid, c.Param("id"), Vehicle{
		Make:        req.Make,
		Model:       req.Model,
		Year:        req.Year,
		PlateNumber: req.PlateNumber,
		FuelType:    req.FuelType,
		Odometer:    req.Odometer,
		PhotoURL:    req.PhotoURL,
	})
	if err != nil {
		respondStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handlers) Delete(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	if err := h.store.Delete(c.Request.Context(), uid, c.Param("id")); err != nil {
		respondStoreErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ClearAllData permanently deletes every vehicle this user owns (and, via ON DELETE CASCADE,
// all of its fuel/maintenance/expense/reminder rows). Irreversible — the mobile client is
// responsible for confirming with the user before calling this.
func (h *Handlers) ClearAllData(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	if err := h.dataStore.ClearAll(c.Request.Context(), uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear data"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handlers) SetPrimary(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	v, err := h.store.SetPrimary(c.Request.Context(), uid, c.Param("id"))
	if err != nil {
		respondStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, v)
}

func respondStoreErr(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "vehicle not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
}

type fuelLogRequest struct {
	Date     time.Time `json:"date"`
	Litres   float64   `json:"litres"`
	Cost     float64   `json:"cost"`
	Odometer float64   `json:"odometer"`
	Station  string    `json:"station"`
}

func (h *Handlers) CreateFuelLog(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	var req fuelLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if req.Litres <= 0 || req.Cost <= 0 || req.Odometer <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "litres, cost, and odometer must be positive"})
		return
	}
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	log, err := h.fuelStore.Create(c.Request.Context(), uuid.NewString(), vehicleID, req.Date, req.Litres, req.Cost, req.Odometer, req.Station)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create fuel log"})
		return
	}
	if err := h.publisher.PublishExpenseCreated(vehicleID, uid, "fuel", log.Cost, log.Date); err != nil {
		stdlog.Printf("failed to publish vehicle.expense.created for fuel log %s: %v", log.ID, err)
	}
	c.JSON(http.StatusCreated, log)
}

func (h *Handlers) ListFuelLogs(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	logs, err := h.fuelStore.ListByVehicle(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list fuel logs"})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *Handlers) DeleteFuelLog(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	if err := h.fuelStore.Delete(c.Request.Context(), uid, c.Param("id")); err != nil {
		if errors.Is(err, ErrFuelLogNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "fuel log not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

type maintenanceLogRequest struct {
	ServiceName     string    `json:"service_name"`
	Date            time.Time `json:"date"`
	Odometer        float64   `json:"odometer"`
	Cost            float64   `json:"cost"`
	NextDueDate     time.Time `json:"next_due_date"`
	NextDueOdometer float64   `json:"next_due_odometer"`
	ReceiptURL      string    `json:"receipt_url"`
}

func (h *Handlers) CreateMaintenanceLog(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	var req maintenanceLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if req.ServiceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "service_name is required"})
		return
	}
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	log, err := h.maintenanceStore.Create(c.Request.Context(), uuid.NewString(), vehicleID, MaintenanceLog{
		ServiceName:     req.ServiceName,
		Date:            req.Date,
		Odometer:        req.Odometer,
		Cost:            req.Cost,
		NextDueDate:     req.NextDueDate,
		NextDueOdometer: req.NextDueOdometer,
		ReceiptURL:      req.ReceiptURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create maintenance log"})
		return
	}
	if err := h.publisher.PublishExpenseCreated(vehicleID, uid, "maintenance", log.Cost, log.Date); err != nil {
		stdlog.Printf("failed to publish vehicle.expense.created for maintenance log %s: %v", log.ID, err)
	}
	c.JSON(http.StatusCreated, log)
}

func (h *Handlers) ListMaintenanceLogs(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	logs, err := h.maintenanceStore.ListByVehicle(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list maintenance logs"})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *Handlers) DeleteMaintenanceLog(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	if err := h.maintenanceStore.Delete(c.Request.Context(), uid, c.Param("id")); err != nil {
		if errors.Is(err, ErrMaintenanceLogNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "maintenance log not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

type expenseRequest struct {
	Type   string    `json:"type"`
	Amount float64   `json:"amount"`
	Date   time.Time `json:"date"`
	Note   string    `json:"note"`
}

func (h *Handlers) CreateExpense(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	var req expenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if !IsValidExpenseType(req.Type) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid expense type"})
		return
	}
	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be positive"})
		return
	}
	if req.Date.IsZero() {
		req.Date = time.Now()
	}

	expense, err := h.expenseStore.Create(c.Request.Context(), uuid.NewString(), vehicleID, VehicleExpense{
		Type:   req.Type,
		Amount: req.Amount,
		Date:   req.Date,
		Note:   req.Note,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create expense"})
		return
	}
	if err := h.publisher.PublishExpenseCreated(vehicleID, uid, expense.Type, expense.Amount, expense.Date); err != nil {
		stdlog.Printf("failed to publish vehicle.expense.created for expense %s: %v", expense.ID, err)
	}
	c.JSON(http.StatusCreated, expense)
}

func (h *Handlers) ListExpenses(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	expenses, err := h.expenseStore.ListByVehicle(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list expenses"})
		return
	}
	c.JSON(http.StatusOK, expenses)
}

func (h *Handlers) DeleteExpense(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	if err := h.expenseStore.Delete(c.Request.Context(), uid, c.Param("id")); err != nil {
		if errors.Is(err, ErrExpenseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "expense not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

type reminderRequest struct {
	Title            string    `json:"title"`
	Kind             string    `json:"kind"`
	DueDate          time.Time `json:"due_date"`
	DueOdometer      float64   `json:"due_odometer"`
	NotifyDaysBefore int       `json:"notify_days_before"`
}

func (h *Handlers) CreateReminder(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	var req reminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if req.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}
	if !IsValidReminderKind(req.Kind) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reminder kind"})
		return
	}

	reminder, err := h.reminderStore.Create(c.Request.Context(), uuid.NewString(), vehicleID, Reminder{
		Title:            req.Title,
		Kind:             req.Kind,
		DueDate:          req.DueDate,
		DueOdometer:      req.DueOdometer,
		NotifyDaysBefore: req.NotifyDaysBefore,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create reminder"})
		return
	}
	c.JSON(http.StatusCreated, reminder)
}

func (h *Handlers) ListReminders(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	reminders, err := h.reminderStore.ListByVehicle(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list reminders"})
		return
	}
	c.JSON(http.StatusOK, reminders)
}

func (h *Handlers) UpdateReminder(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	var req reminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}
	if req.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}
	if !IsValidReminderKind(req.Kind) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reminder kind"})
		return
	}

	reminder, err := h.reminderStore.Update(c.Request.Context(), uid, c.Param("id"), Reminder{
		Title:            req.Title,
		Kind:             req.Kind,
		DueDate:          req.DueDate,
		DueOdometer:      req.DueOdometer,
		NotifyDaysBefore: req.NotifyDaysBefore,
	})
	if err != nil {
		if errors.Is(err, ErrReminderNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "reminder not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.JSON(http.StatusOK, reminder)
}

func (h *Handlers) DeleteReminder(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	if err := h.reminderStore.Delete(c.Request.Context(), uid, c.Param("id")); err != nil {
		if errors.Is(err, ErrReminderNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "reminder not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handlers) CostOfOwnership(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	result, err := h.analyticsStore.CostOfOwnership(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute cost of ownership"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handlers) MonthlyBreakdown(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	result, err := h.analyticsStore.MonthlyBreakdown(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute monthly breakdown"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handlers) EfficiencyTrend(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}
	vehicleID := c.Param("id")

	if _, err := h.store.GetByID(c.Request.Context(), uid, vehicleID); err != nil {
		respondStoreErr(c, err)
		return
	}

	result, err := h.analyticsStore.EfficiencyTrend(c.Request.Context(), uid, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compute efficiency trend"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handlers) CompareVehicles(c *gin.Context) {
	uid, ok := userID(c)
	if !ok {
		return
	}

	idsParam := c.Query("ids")
	if idsParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids query parameter is required"})
		return
	}
	ids := strings.Split(idsParam, ",")

	result, err := h.analyticsStore.Compare(c.Request.Context(), uid, ids)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to compare vehicles"})
		return
	}
	c.JSON(http.StatusOK, result)
}
