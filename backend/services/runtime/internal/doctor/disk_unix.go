//go:build !windows

package doctor

import "syscall"

func diskFreeGBOS(path string) (float64, bool) {
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		return 0, false
	}
	free := float64(st.Bavail) * float64(st.Bsize) / (1024 * 1024 * 1024)
	return free, true
}
