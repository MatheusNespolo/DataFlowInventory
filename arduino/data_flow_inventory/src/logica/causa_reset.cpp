#include "causa_reset.h"

#include "texto_flash.h"

const char* causaReset(uint8_t mcusr, bool assinaturaValida, bool marcaWatchdog) {
  if ((mcusr & MCUSR_WDRF) || (assinaturaValida && marcaWatchdog)) return TXT("watchdog");
  if (mcusr & MCUSR_BORF) return TXT("brownout");
  if ((mcusr & MCUSR_PORF) || !assinaturaValida) return TXT("energia");
  return TXT("reinicio");
}
