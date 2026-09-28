import { TAU } from '../core/math'
import { glowSprite, P } from './palette'

/** Profile rewards are scenery only; they never cover pads or change combat. */
export function drawSettlement(ctx: CanvasRenderingContext2D, stage: number, bunting: boolean, harbour: boolean, gardens: boolean) {
  ctx.save()
  for (const [x, y] of [[90, 820], [615, 820], [650, 355]]) {
    ctx.fillStyle = '#34464a'; ctx.fillRect(x - 26, y - 36, 52, 44)
    ctx.fillStyle = '#745b51'; ctx.beginPath(); ctx.moveTo(x - 34, y - 36); ctx.lineTo(x, y - 64); ctx.lineTo(x + 34, y - 36); ctx.closePath(); ctx.fill()
    ctx.fillStyle = stage >= 1 ? P.amberHi : '#142b34'
    ctx.fillRect(x - 17, y - 26, 12, 14); ctx.fillRect(x + 5, y - 26, 12, 14)
    if (stage >= 1) ctx.drawImage(glowSprite(P.amber, 64), x - 36, y - 49, 72, 64)
    if (bunting) {
      ctx.strokeStyle = P.cream; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 34, y - 31); ctx.quadraticCurveTo(x, y - 15, x + 34, y - 31); ctx.stroke()
      for (let i = 0; i < 5; i++) { const bx = x - 28 + i * 12; ctx.fillStyle = [P.coral, P.ice, P.amber][i % 3]; ctx.beginPath(); ctx.moveTo(bx, y - 25); ctx.lineTo(bx + 9, y - 25); ctx.lineTo(bx + 4, y - 14); ctx.fill() }
    }
  }
  if (stage >= 2) {
    // A small pedestrian crossing on the west inlet, away from build pads.
    ctx.strokeStyle = '#aa9271'; ctx.lineWidth = 7
    ctx.beginPath(); ctx.moveTo(93, 475); ctx.lineTo(93, 535); ctx.moveTo(114, 475); ctx.lineTo(114, 535); ctx.stroke()
    ctx.lineWidth = 4
    for (let y = 479; y <= 531; y += 8) { ctx.beginPath(); ctx.moveTo(87, y); ctx.lineTo(120, y); ctx.stroke() }
    for (const [x, y] of [[73, 550], [99, 560], [51, 539]]) {
      ctx.fillStyle = P.cream; ctx.beginPath(); ctx.arc(x, y - 10, 4, 0, TAU); ctx.fill()
      ctx.fillStyle = P.lime; ctx.fillRect(x - 4, y - 5, 8, 11)
    }
  }
  if (harbour && stage >= 3) {
    for (const [x, y] of [[81, -313], [631, -231], [90, -74]]) {
      ctx.fillStyle = '#907551'; ctx.beginPath(); ctx.ellipse(x, y, 23, 10, -.25, 0, TAU); ctx.fill()
      ctx.fillStyle = P.amberHi; ctx.fillRect(x - 4, y - 21, 8, 15)
      ctx.drawImage(glowSprite(P.amber, 64), x - 24, y - 35, 48, 48)
    }
  }
  if (gardens && stage >= 4) for (const [x, y] of [[80, -677], [625, -645], [88, -636], [640, -686]]) {
    ctx.fillStyle = '#73a184'; ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = P.pink; ctx.beginPath(); ctx.arc(x - 3, y - 5, 6, 0, TAU); ctx.fill()
  }
  ctx.restore()
}
