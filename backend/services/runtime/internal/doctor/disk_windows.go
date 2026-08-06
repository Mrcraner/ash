//go:build windows

package doctor

import (
	"syscall"
	"unsafe"
)

func diskFreeGBOS(path string) (float64, bool) {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	proc := kernel32.NewProc("GetDiskFreeSpaceExW")
	var freeBytesAvailable, totalNumberOfBytes, totalNumberOfFreeBytes int64
	ptr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0, false
	}
	r1, _, _ := proc.Call(
		uintptr(unsafe.Pointer(ptr)),
		uintptr(unsafe.Pointer(&freeBytesAvailable)),
		uintptr(unsafe.Pointer(&totalNumberOfBytes)),
		uintptr(unsafe.Pointer(&totalNumberOfFreeBytes)),
	)
	if r1 == 0 {
		return 0, false
	}
	return float64(freeBytesAvailable) / (1024 * 1024 * 1024), true
}
