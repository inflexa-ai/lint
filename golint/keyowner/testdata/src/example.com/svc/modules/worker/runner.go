package worker

import (
	"fmt"

	"example.com/svc/modules/iam"
)

type Opts struct {
	Queue string `json:"queue"`
}

const localPrefix = "iam_"

const billing = localPrefix + "billing" // want `the key "iam_billing" belongs to example.com/svc/modules/iam`

var (
	opts    = Opts{Queue: "iam_maintenance"} // want `the key "iam_maintenance" belongs to example.com/svc/modules/iam`
	local   = billing                        // want `the key "iam_billing" belongs to example.com/svc/modules/iam`
	foreign = iam.QueueBilling
	paren   = (iam.QueueBilling)
	mixed   = iam.QueueBilling + "_x"    // want `the key "iam_billing_x" belongs to example.com/svc/modules/iam`
	org     = fmt.Sprintf("org:%s", "x") // want `the key "org:%s" belongs to example.com/svc/modules/iam`
	own     = "worker:runner"
	other   = "iam_" + fmt.Sprint(1)
	nested  = ("iam_" + "maint") + "enance" // want `the key "iam_maintenance" belongs to example.com/svc/modules/iam`
)
