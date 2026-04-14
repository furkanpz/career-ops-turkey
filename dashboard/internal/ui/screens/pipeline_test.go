package screens

import (
	"strings"
	"testing"

	"github.com/santifer/career-ops/dashboard/internal/model"
	"github.com/santifer/career-ops/dashboard/internal/theme"
)

func TestWithReloadedDataPreservesStateAndSelection(t *testing.T) {
	initialApps := []model.CareerApplication{
		{
			Company:    "Acme",
			Role:       "Backend Engineer",
			Status:     "Evaluated",
			Score:      4.2,
			ReportPath: "reports/001-acme.md",
		},
		{
			Company:    "Beta",
			Role:       "Platform Engineer",
			Status:     "Applied",
			Score:      4.6,
			ReportPath: "reports/002-beta.md",
		},
	}

	pm := NewPipelineModel(
		theme.NewTheme("catppuccin-mocha"),
		initialApps,
		model.PipelineMetrics{Total: len(initialApps)},
		"..",
		120,
		40,
	)
	pm.sortMode = sortCompany
	pm.activeTab = 0
	pm.viewMode = "flat"
	pm.applyFilterAndSort()
	pm.cursor = 1
	pm.reportCache["reports/002-beta.md"] = reportSummary{tldr: "cached"}

	refreshedApps := []model.CareerApplication{
		initialApps[0],
		initialApps[1],
		{
			Company:    "Gamma",
			Role:       "AI Engineer",
			Status:     "Interview",
			Score:      4.8,
			ReportPath: "reports/003-gamma.md",
		},
	}

	reloaded := pm.WithReloadedData(refreshedApps, model.PipelineMetrics{Total: len(refreshedApps)})

	if reloaded.sortMode != sortCompany {
		t.Fatalf("expected sort mode %q, got %q", sortCompany, reloaded.sortMode)
	}
	if reloaded.viewMode != "flat" {
		t.Fatalf("expected view mode to stay flat, got %q", reloaded.viewMode)
	}
	if got := len(reloaded.filtered); got != 3 {
		t.Fatalf("expected 3 filtered apps after refresh, got %d", got)
	}
	if app, ok := reloaded.CurrentApp(); !ok || app.ReportPath != "reports/002-beta.md" {
		t.Fatalf("expected selection to stay on beta app, got %+v (ok=%v)", app, ok)
	}
	if reloaded.reportCache["reports/002-beta.md"].tldr != "cached" {
		t.Fatal("expected cached report summaries to survive refresh")
	}
}

func TestRenderAppLineIncludesDateColumn(t *testing.T) {
	pm := NewPipelineModel(
		theme.NewTheme("catppuccin-mocha"),
		nil,
		model.PipelineMetrics{},
		"..",
		120,
		40,
	)

	line := pm.renderAppLine(model.CareerApplication{
		Date:    "2026-04-13",
		Company: "Anthropic",
		Role:    "Forward Deployed Engineer",
		Status:  "Applied",
		Score:   4.5,
	}, false)

	if !strings.Contains(line, "2026-04-13") {
		t.Fatalf("expected rendered line to include date column, got %q", line)
	}
}

func TestTurkeyPresetFilters(t *testing.T) {
	apps := []model.CareerApplication{
		{
			Company:            "Acme",
			Role:               "Backend Engineer",
			Status:             "Evaluated",
			Score:              4.1,
			City:               "istanbul",
			WorkModel:          "hybrid",
			Language:           "tr_en",
			SalaryTransparency: "transparent",
			SalaryTransparent:  true,
			ConfidenceScore:    0.72,
		},
		{
			Company:         "Beta",
			Role:            "Platform Engineer",
			Status:          "Evaluated",
			Score:           3.8,
			City:            "ankara",
			WorkModel:       "on_site",
			Language:        "tr",
			Confidence:      "low",
			ConfidenceScore: 0.52,
		},
	}

	pm := NewPipelineModel(
		theme.NewTheme("catppuccin-mocha"),
		apps,
		model.PipelineMetrics{Total: len(apps)},
		"..",
		120,
		40,
	)

	cases := []struct {
		filter string
		want   string
	}{
		{filterRemote, "Acme"},
		{filterIstanbul, "Acme"},
		{filterTrEn, "Acme"},
		{filterSalary, "Acme"},
		{filterReview, "Beta"},
	}

	for _, tc := range cases {
		t.Run(tc.filter, func(t *testing.T) {
			pm.activeTab = tabIndex(tc.filter)
			pm.applyFilterAndSort()
			if len(pm.filtered) != 1 || pm.filtered[0].Company != tc.want {
				t.Fatalf("expected %s filter to keep %s, got %+v", tc.filter, tc.want, pm.filtered)
			}
		})
	}
}

func tabIndex(filter string) int {
	for i, tab := range pipelineTabs {
		if tab.filter == filter {
			return i
		}
	}
	return 0
}
