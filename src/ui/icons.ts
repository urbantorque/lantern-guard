// Phosphor icons (MIT), imported as raw SVG so they inherit currentColor.
import play from '@phosphor-icons/core/assets/fill/play-fill.svg?raw'
import pause from '@phosphor-icons/core/assets/fill/pause-fill.svg?raw'
import fastForward from '@phosphor-icons/core/assets/fill/fast-forward-fill.svg?raw'
import heart from '@phosphor-icons/core/assets/fill/heart-fill.svg?raw'
import gear from '@phosphor-icons/core/assets/bold/gear-bold.svg?raw'
import restart from '@phosphor-icons/core/assets/bold/arrow-counter-clockwise-bold.svg?raw'
import house from '@phosphor-icons/core/assets/bold/house-bold.svg?raw'
import speaker from '@phosphor-icons/core/assets/fill/speaker-high-fill.svg?raw'
import speakerOff from '@phosphor-icons/core/assets/fill/speaker-slash-fill.svg?raw'
import sparkle from '@phosphor-icons/core/assets/fill/sparkle-fill.svg?raw'
import lightning from '@phosphor-icons/core/assets/fill/lightning-fill.svg?raw'
import trash from '@phosphor-icons/core/assets/bold/trash-bold.svg?raw'
import crosshair from '@phosphor-icons/core/assets/bold/crosshair-bold.svg?raw'
import star from '@phosphor-icons/core/assets/fill/star-fill.svg?raw'
import lock from '@phosphor-icons/core/assets/fill/lock-simple-fill.svg?raw'
import close from '@phosphor-icons/core/assets/bold/x-bold.svg?raw'
import swap from '@phosphor-icons/core/assets/bold/arrows-left-right-bold.svg?raw'
import tap from '@phosphor-icons/core/assets/fill/hand-tap-fill.svg?raw'
import question from '@phosphor-icons/core/assets/bold/question-bold.svg?raw'
import eye from '@phosphor-icons/core/assets/fill/eye-fill.svg?raw'
import flower from '@phosphor-icons/core/assets/fill/flower-fill.svg?raw'
import trophy from '@phosphor-icons/core/assets/fill/trophy-fill.svg?raw'
import caretLeft from '@phosphor-icons/core/assets/bold/caret-left-bold.svg?raw'
import caretRight from '@phosphor-icons/core/assets/bold/caret-right-bold.svg?raw'
import bendLeft from '@phosphor-icons/core/assets/bold/arrow-bend-up-left-bold.svg?raw'
import bendRight from '@phosphor-icons/core/assets/bold/arrow-bend-up-right-bold.svg?raw'
import target from '@phosphor-icons/core/assets/bold/target-bold.svg?raw'
import music from '@phosphor-icons/core/assets/fill/music-notes-fill.svg?raw'
import drop from '@phosphor-icons/core/assets/fill/drop-fill.svg?raw'
import coins from '@phosphor-icons/core/assets/fill/coins-fill.svg?raw'
import moon from '@phosphor-icons/core/assets/fill/moon-fill.svg?raw'
import sun from '@phosphor-icons/core/assets/fill/sun-fill.svg?raw'
import calendar from '@phosphor-icons/core/assets/fill/calendar-dots-fill.svg?raw'
import share from '@phosphor-icons/core/assets/fill/export-fill.svg?raw'
import book from '@phosphor-icons/core/assets/fill/book-open-text-fill.svg?raw'
import copy from '@phosphor-icons/core/assets/fill/copy-simple-fill.svg?raw'
import download from '@phosphor-icons/core/assets/fill/download-simple-fill.svg?raw'
import chart from '@phosphor-icons/core/assets/fill/chart-bar-fill.svg?raw'
import waves from '@phosphor-icons/core/assets/fill/waves-fill.svg?raw'
import check from '@phosphor-icons/core/assets/fill/check-circle-fill.svg?raw'
import image from '@phosphor-icons/core/assets/fill/image-fill.svg?raw'

export const ICON = {
  play,
  pause,
  fastForward,
  heart,
  gear,
  restart,
  house,
  speaker,
  speakerOff,
  sparkle,
  lightning,
  trash,
  crosshair,
  star,
  lock,
  close,
  swap,
  tap,
  question,
  eye,
  flower,
  trophy,
  caretLeft,
  caretRight,
  bendLeft,
  bendRight,
  target,
  music,
  drop,
  coins,
  moon,
  sun,
  calendar,
  share,
  book,
  copy,
  download,
  chart,
  waves,
  check,
  image,
}

export type IconName = keyof typeof ICON

export function icon(name: IconName, cls = ''): string {
  return ICON[name].replace('<svg', `<svg aria-hidden="true" focusable="false" class="ic ${cls}"`)
}
