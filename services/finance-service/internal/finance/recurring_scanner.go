package finance

import (
	"context"
	"log"
	"time"
)

// RunRecurringScanner periodically generates the next occurrence for every recurring
// transaction template that's come due, publishing/threshold-checking each one exactly like a
// manually created transaction. Runs once immediately, then on every tick, until ctx is done —
// same shape as vehicle-service's RunReminderScanner.
func RunRecurringScanner(ctx context.Context, store *RecurringTransactionStore, budgets *BudgetStore, publisher *Publisher, interval time.Duration) {
	scanOnce(ctx, store, budgets, publisher)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			scanOnce(ctx, store, budgets, publisher)
		}
	}
}

func scanOnce(ctx context.Context, store *RecurringTransactionStore, budgets *BudgetStore, publisher *Publisher) {
	due, err := store.DueForGeneration(ctx)
	if err != nil {
		log.Printf("recurring transaction scan: failed to query due templates: %v", err)
		return
	}

	for _, rt := range due {
		t, err := store.GenerateOccurrence(ctx, rt)
		if err != nil {
			log.Printf("recurring transaction scan: failed to generate occurrence for %s: %v", rt.ID, err)
			continue
		}
		afterTransactionWrite(publisher, budgets, *t)
	}
}
