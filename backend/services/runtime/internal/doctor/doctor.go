package doctor

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

// Report is returned by GET /api/local/v1/doctor.
type Report struct {
	OS              string     `json:"os"`
	Arch            string     `json:"arch"`
	GoMaxProcs      int        `json:"go_max_procs"`
	CharactersDir   string     `json:"characters_dir"`
	CharactersOK    bool       `json:"characters_ok"`
	DiskFreeGB      *float64   `json:"disk_free_gb,omitempty"`
	GPU             []GPUInfo  `json:"gpu"`
	NvidiaSMI       bool       `json:"nvidia_smi"`
	SuggestedTier   string     `json:"suggested_tier"` // none | pro_min | pro_rec | cinema
	Notes           []string   `json:"notes"`
	RenderModes     []string   `json:"render_modes_likely"`
}

type GPUInfo struct {
	Name          string `json:"name"`
	MemoryTotalMB int    `json:"memory_total_mb"`
	DriverVersion string `json:"driver_version,omitempty"`
}

// Run gathers local hardware hints for Pro/Cinema gating (best-effort).
func Run(charactersDir string) Report {
	rep := Report{
		OS:            runtime.GOOS,
		Arch:          runtime.GOARCH,
		GoMaxProcs:    runtime.GOMAXPROCS(0),
		CharactersDir: charactersDir,
		Notes:         nil,
		GPU:           []GPUInfo{},
	}

	if charactersDir != "" {
		if st, err := os.Stat(charactersDir); err == nil && st.IsDir() {
			rep.CharactersOK = true
		} else {
			rep.Notes = append(rep.Notes, "characters_dir missing or not a directory")
		}
	} else {
		rep.Notes = append(rep.Notes, "characters_dir not configured")
	}

	if free, ok := diskFreeGB(charactersDir); ok {
		rep.DiskFreeGB = &free
		if free < 40 {
			rep.Notes = append(rep.Notes, "disk free < 40GB; Pro model packs may not fit")
		}
	}

	gpus, smiOK := probeNvidia()
	rep.NvidiaSMI = smiOK
	rep.GPU = gpus
	if !smiOK {
		rep.Notes = append(rep.Notes, "nvidia-smi not found; Pro/Cinema require NVIDIA GPU")
	}

	vram := maxVRAM(gpus)
	switch {
	case vram >= 16000:
		rep.SuggestedTier = "cinema"
		rep.RenderModes = []string{"livetalking", "ue"}
	case vram >= 12000:
		rep.SuggestedTier = "pro_rec"
		rep.RenderModes = []string{"livetalking"}
		rep.Notes = append(rep.Notes, "12GB+: MuseTalk tier recommended; UE Cinema optional later")
	case vram >= 8000:
		rep.SuggestedTier = "pro_min"
		rep.RenderModes = []string{"livetalking"}
		rep.Notes = append(rep.Notes, "8GB: use Wav2Lip + quantized LLM; avoid MuseTalk+large LLM together")
	default:
		rep.SuggestedTier = "none"
		rep.RenderModes = []string{}
		if smiOK {
			rep.Notes = append(rep.Notes, "VRAM below Pro minimum (8GB); use Web standard tier")
		}
	}

	return rep
}

func maxVRAM(gpus []GPUInfo) int {
	max := 0
	for _, g := range gpus {
		if g.MemoryTotalMB > max {
			max = g.MemoryTotalMB
		}
	}
	return max
}

func probeNvidia() ([]GPUInfo, bool) {
	cmd := exec.Command("nvidia-smi",
		"--query-gpu=name,memory.total,driver_version",
		"--format=csv,noheader,nounits")
	out, err := cmd.Output()
	if err != nil {
		return nil, false
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var gpus []GPUInfo
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := splitCSV(line)
		if len(parts) < 2 {
			continue
		}
		mb, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
		g := GPUInfo{
			Name:          strings.TrimSpace(parts[0]),
			MemoryTotalMB: mb,
		}
		if len(parts) >= 3 {
			g.DriverVersion = strings.TrimSpace(parts[2])
		}
		gpus = append(gpus, g)
	}
	return gpus, len(gpus) > 0
}

func splitCSV(s string) []string {
	raw := strings.Split(s, ",")
	out := make([]string, 0, len(raw))
	for _, p := range raw {
		out = append(out, strings.TrimSpace(p))
	}
	return out
}

func diskFreeGB(path string) (float64, bool) {
	if path == "" {
		path = "."
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	return diskFreeGBOS(abs)
}
