#include "causa_reset.h"

#include "texto_flash.h"

const char* causaReset(uint8_t mcusr, bool assinaturaValida, bool marcaWatchdog) {
  if ((mcusr & MCUSR_WDRF) || (assinaturaValida && marcaWatchdog)) return TXT("watchdog");
  // Energia antes de brownout: a energização acende PORF e BORF juntos (0x05).
  if ((mcusr & MCUSR_PORF) || !assinaturaValida) return TXT("energia");
  if (mcusr & MCUSR_BORF) return TXT("brownout");
  return TXT("reinicio");
}
