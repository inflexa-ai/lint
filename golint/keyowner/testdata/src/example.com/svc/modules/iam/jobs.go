package iam

import "fmt"

const (
	jobsModulePrefix = "iam_"
	queueMaintenance = jobsModulePrefix + "maintenance"
	QueueBilling     = jobsModulePrefix + "billing"
)

func orgKey(id string) string { return fmt.Sprintf("org:%s", id) }

var queues = []string{queueMaintenance, QueueBilling}
