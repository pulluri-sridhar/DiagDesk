package model_test

import (
	"testing"

	"github.com/diagdesk/sync-engine/internal/model"
)

func TestVectorClock_Increment(t *testing.T) {
	vc := model.VectorClock{"branch-01": 2, "central": 5}
	next := vc.Increment("branch-01")
	if next["branch-01"] != 3 {
		t.Errorf("branch-01 after increment: got %d, want 3", next["branch-01"])
	}
	if next["central"] != 5 {
		t.Errorf("central unchanged: got %d, want 5", next["central"])
	}
	if vc["branch-01"] != 2 {
		t.Error("Increment must not mutate the receiver")
	}
}

func TestVectorClock_Dominates(t *testing.T) {
	a := model.VectorClock{"branch-01": 3, "central": 5}
	b := model.VectorClock{"branch-01": 2, "central": 5}
	if !a.Dominates(b) {
		t.Error("a should dominate b (a >= b on every node)")
	}
	if b.Dominates(a) {
		t.Error("b should not dominate a (b < a on branch-01)")
	}
}

func TestVectorClock_Concurrent(t *testing.T) {
	// branch is ahead on branch-01; central is ahead on central — true conflict
	branch := model.VectorClock{"branch-01": 3, "central": 5}
	central := model.VectorClock{"branch-01": 2, "central": 6}
	if !branch.Concurrent(central) {
		t.Error("branch and central should be concurrent (neither dominates)")
	}
	if !central.Concurrent(branch) {
		t.Error("Concurrent must be symmetric")
	}
}

func TestVectorClock_Merge(t *testing.T) {
	a := model.VectorClock{"branch-01": 3, "central": 5}
	b := model.VectorClock{"branch-01": 2, "central": 6, "branch-02": 1}
	merged := a.Merge(b)
	if merged["branch-01"] != 3 {
		t.Errorf("branch-01 in merge: got %d, want 3", merged["branch-01"])
	}
	if merged["central"] != 6 {
		t.Errorf("central in merge: got %d, want 6", merged["central"])
	}
	if merged["branch-02"] != 1 {
		t.Errorf("branch-02 in merge: got %d, want 1", merged["branch-02"])
	}
}
