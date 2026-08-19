(() => {
  "use strict";

  // Every character uses the same named-joint rig. New motions only need to add
  // declarative keyframes here; the renderer and game rules stay untouched.
  const base = {
    head: [0, -91], neck: [0, -72], shoulder: [0, -66], hip: [0, -35],
    elbowL: [-18, -53], handL: [-28, -42],
    elbowR: [18, -53], handR: [28, -42],
    kneeL: [-13, -18], footL: [-22, 0],
    kneeR: [13, -18], footR: [22, 0]
  };

  const frame = (at, joints, ease = "smooth") => ({ at, joints, ease });
  const clips = {
    idle: {
      duration: 1.8, loop: true,
      frames: [
        frame(0, { head:[0,-91], shoulder:[0,-66], hip:[0,-35], handL:[-28,-42], handR:[28,-42] }),
        frame(.5, { head:[0,-93], shoulder:[0,-68], hip:[0,-36], handL:[-29,-44], handR:[29,-44], kneeL:[-14,-18], kneeR:[14,-18] }),
        frame(1, { head:[0,-91], shoulder:[0,-66], hip:[0,-35], handL:[-28,-42], handR:[28,-42] })
      ]
    },
    pitcherSet: {
      duration: 2.1, loop: true,
      frames: [
        frame(0, {
          head:[1,-91], neck:[0,-72], shoulder:[-1,-66], hip:[1,-35],
          elbowL:[-13,-57], handL:[-3,-60], elbowR:[12,-56], handR:[3,-59],
          kneeL:[-12,-18], footL:[-21,0], kneeR:[12,-18], footR:[21,0]
        }),
        frame(.48, {
          head:[0,-92], neck:[-1,-73], shoulder:[-2,-67], hip:[0,-36],
          elbowL:[-13,-58], handL:[-3,-61], elbowR:[12,-57], handR:[3,-60],
          kneeL:[-12,-19], footL:[-21,0], kneeR:[12,-19], footR:[21,0]
        }),
        frame(1, {
          head:[1,-91], neck:[0,-72], shoulder:[-1,-66], hip:[1,-35],
          elbowL:[-13,-57], handL:[-3,-60], elbowR:[12,-56], handR:[3,-59],
          kneeL:[-12,-18], footL:[-21,0], kneeR:[12,-18], footR:[21,0]
        })
      ]
    },
    pitcherWindup: {
      duration: 1.28, loop: false, ease: "easeInOut",
      frames: [
        // Frames 1-2: set position and a small rock onto the back leg.
        frame(0, { head:[1,-91], neck:[0,-72], shoulder:[-1,-66], hip:[1,-35], elbowL:[-13,-57], handL:[-3,-60], elbowR:[12,-56], handR:[3,-59], kneeL:[-12,-18], footL:[-21,0], kneeR:[12,-18], footR:[21,0] }),
        frame(.08, { head:[0,-92], neck:[-1,-73], shoulder:[-2,-67], hip:[0,-36], elbowL:[-13,-58], handL:[-3,-61], elbowR:[12,-57], handR:[3,-60], kneeL:[-12,-19], footL:[-20,0], kneeR:[12,-19], footR:[21,0] }),
        frame(.16, { head:[-1,-92], neck:[-2,-73], shoulder:[-3,-67], hip:[-2,-36], elbowL:[-13,-58], handL:[-3,-62], elbowR:[12,-57], handR:[3,-61], kneeL:[-11,-18], footL:[-19,0], kneeR:[13,-19], footR:[22,0] }, "easeIn"),
        frame(.27, { head:[-2,-93], neck:[-3,-74], shoulder:[-5,-68], hip:[-4,-37], elbowL:[-16,-60], handL:[-4,-65], elbowR:[14,-59], handR:[4,-64], kneeL:[-11,-19], footL:[-19,0], kneeR:[10,-33], footR:[18,-28] }),
        // Frames 3-4: lead knee rises and pauses at the balance point.
        frame(.38, { head:[-3,-94], neck:[-4,-74], shoulder:[-5,-69], hip:[-4,-38], elbowL:[-15,-61], handL:[-3,-67], elbowR:[14,-60], handR:[3,-66], kneeL:[-12,-20], footL:[-21,0], kneeR:[8,-43], footR:[17,-48] }, "easeOut"),
        frame(.48, { head:[-4,-95], neck:[-5,-75], shoulder:[-6,-70], hip:[-5,-39], elbowL:[-15,-62], handL:[-3,-68], elbowR:[13,-61], handR:[3,-67], kneeL:[-11,-21], footL:[-20,0], kneeR:[10,-47], footR:[19,-51] }),
        frame(.57, { head:[-4,-95], neck:[-5,-75], shoulder:[-6,-70], hip:[-5,-39], elbowL:[-14,-62], handL:[-2,-68], elbowR:[13,-61], handR:[2,-67], kneeL:[-11,-21], footL:[-20,0], kneeR:[12,-48], footR:[21,-50] }),
        frame(.67, { head:[-3,-94], neck:[-4,-74], shoulder:[-5,-69], hip:[-3,-38], elbowL:[4,-76], handL:[10,-66], elbowR:[-8,-86], handR:[-10,-80], kneeL:[-10,-20], footL:[-19,0], kneeR:[14,-43], footR:[26,-39] }),
        // Frames 5-6: stride begins while glove and throwing hand separate.
        frame(.76, { head:[-2,-93], neck:[-2,-73], shoulder:[-2,-68], hip:[1,-37], elbowL:[15,-76], handL:[32,-62], elbowR:[-18,-84], handR:[-31,-73], kneeL:[-8,-20], footL:[-17,0], kneeR:[18,-34], footR:[34,-28] }, "easeIn"),
        frame(.9, { head:[0,-92], neck:[0,-72], shoulder:[1,-67], hip:[6,-35], elbowL:[18,-78], handL:[36,-62], elbowR:[-25,-87], handR:[-39,-73], kneeL:[-6,-19], footL:[-17,0], kneeR:[23,-24], footR:[43,-10] }),
        frame(1, { head:[1,-91], neck:[2,-71], shoulder:[4,-66], hip:[9,-34], elbowL:[19,-78], handL:[38,-62], elbowR:[-28,-88], handR:[-43,-72], kneeL:[-5,-19], footL:[-18,0], kneeR:[27,-18], footR:[49,0] }, "snap")
      ]
    },
    pitcherThrow: {
      duration: 1.02, loop: false, ease: "easeOut",
      frames: [
        // Frame 7: arm cocks above the shoulder; front foot is now planted.
        frame(0, { head:[1,-91], neck:[2,-71], shoulder:[4,-66], hip:[9,-34], elbowL:[22,-65], handL:[38,-62], elbowR:[-26,-74], handR:[-43,-72], kneeL:[-5,-19], footL:[-18,0], kneeR:[27,-18], footR:[49,0] }),
        frame(.08, { head:[2,-91], neck:[4,-71], shoulder:[6,-66], hip:[11,-34], elbowL:[24,-64], handL:[39,-60], elbowR:[-23,-79], handR:[-37,-84], kneeL:[-6,-19], footL:[-19,0], kneeR:[28,-18], footR:[50,0] }),
        frame(.16, { head:[4,-91], neck:[6,-70], shoulder:[8,-66], hip:[12,-33], elbowL:[25,-62], handL:[39,-58], elbowR:[-18,-82], handR:[-27,-91], kneeL:[-7,-18], footL:[-20,0], kneeR:[29,-17], footR:[51,0] }, "snap"),
        frame(.23, { head:[5,-90], neck:[7,-69], shoulder:[9,-65], hip:[13,-33], elbowL:[22,-56], handL:[33,-51], elbowR:[-11,-85], handR:[-9,-98], kneeL:[-8,-18], footL:[-21,0], kneeR:[29,-17], footR:[51,0] }),
        // Frame 8: the ball passes over the head while the glove folds down.
        frame(.3, { head:[7,-89], neck:[9,-68], shoulder:[11,-64], hip:[14,-32], elbowL:[16,-49], handL:[20,-42], elbowR:[-4,-84], handR:[18,-101], kneeL:[-8,-18], footL:[-21,0], kneeR:[29,-17], footR:[52,0] }, "snap"),
        frame(.38, { head:[11,-86], neck:[14,-66], shoulder:[15,-61], hip:[15,-31], elbowL:[15,-52], handL:[13,-47], elbowR:[20,-77], handR:[43,-84], kneeL:[-9,-17], footL:[-22,0], kneeR:[29,-17], footR:[52,0] }),
        // Frame 9: release. The head and chest chase the throwing hand.
        frame(.45, { head:[18,-79], neck:[20,-61], shoulder:[20,-57], hip:[16,-30], elbowL:[17,-53], handL:[12,-48], elbowR:[39,-67], handR:[59,-61], kneeL:[-10,-17], footL:[-23,0], kneeR:[28,-16], footR:[52,0] }, "snap"),
        frame(.53, { head:[19,-77], neck:[21,-59], shoulder:[22,-55], hip:[17,-30], elbowL:[20,-50], handL:[16,-45], elbowR:[46,-53], handR:[58,-39], kneeL:[-12,-18], footL:[-26,-6], kneeR:[27,-16], footR:[51,0] }),
        // Frames 10-11: trunk folds and the throwing arm whips down.
        frame(.62, { head:[18,-77], neck:[21,-58], shoulder:[24,-53], hip:[18,-29], elbowL:[22,-47], handL:[19,-41], elbowR:[45,-42], handR:[51,-21], kneeL:[-15,-19], footL:[-31,-15], kneeR:[25,-15], footR:[49,0] }, "easeOut"),
        frame(.71, { head:[20,-73], neck:[23,-55], shoulder:[26,-49], hip:[18,-29], elbowL:[24,-43], handL:[20,-37], elbowR:[42,-34], handR:[46,-13], kneeL:[-17,-23], footL:[-36,-27], kneeR:[24,-15], footR:[48,0] }),
        frame(.8, { head:[23,-68], neck:[25,-50], shoulder:[27,-45], hip:[17,-28], elbowL:[25,-39], handL:[19,-32], elbowR:[37,-29], handR:[40,-8], kneeL:[-18,-27], footL:[-39,-36], kneeR:[23,-14], footR:[46,0] }),
        frame(.9, { head:[23,-69], neck:[24,-51], shoulder:[26,-46], hip:[15,-29], elbowL:[23,-39], handL:[16,-32], elbowR:[34,-29], handR:[37,-9], kneeL:[-21,-31], footL:[-42,-42], kneeR:[21,-15], footR:[44,0] }),
        // Frame 12: rear leg peaks behind the bent torso.
        frame(1, { head:[22,-70], neck:[23,-52], shoulder:[24,-47], hip:[14,-29], elbowL:[21,-40], handL:[13,-33], elbowR:[31,-31], handR:[34,-12], kneeL:[-22,-32], footL:[-43,-43], kneeR:[20,-15], footR:[43,0] })
      ]
    },
    pitcherRecover: {
      duration: .86, loop: false, ease: "easeInOut",
      frames: [
        frame(0, { head:[22,-70], neck:[23,-52], shoulder:[24,-47], hip:[14,-29], elbowL:[21,-40], handL:[13,-33], elbowR:[31,-31], handR:[34,-12], kneeL:[-22,-32], footL:[-43,-43], kneeR:[20,-15], footR:[43,0] }),
        frame(.15, { head:[20,-73], neck:[21,-55], shoulder:[22,-50], hip:[13,-30], elbowL:[19,-42], handL:[11,-35], elbowR:[29,-34], handR:[33,-17], kneeL:[-21,-29], footL:[-41,-35], kneeR:[19,-15], footR:[41,0] }),
        frame(.3, { head:[16,-77], neck:[17,-58], shoulder:[18,-53], hip:[11,-30], elbowL:[16,-45], handL:[8,-40], elbowR:[25,-38], handR:[29,-22], kneeL:[-18,-24], footL:[-35,-20], kneeR:[17,-16], footR:[38,0] }, "easeOut"),
        frame(.46, { head:[12,-82], neck:[13,-63], shoulder:[14,-57], hip:[8,-32], elbowL:[10,-50], handL:[3,-48], elbowR:[22,-43], handR:[24,-33], kneeL:[-12,-20], footL:[-28,-8], kneeR:[13,-17], footR:[33,0] }),
        frame(.62, { head:[7,-87], neck:[7,-68], shoulder:[8,-62], hip:[5,-33], elbowL:[-8,-51], handL:[-2,-57], elbowR:[17,-49], handR:[9,-56], kneeL:[-4,-18], footL:[-20,0], kneeR:[8,-18], footR:[26,0] }),
        frame(.8, { head:[6,-87], neck:[6,-68], shoulder:[5,-62], hip:[4,-34], elbowL:[-10,-52], handL:[-4,-43], elbowR:[17,-49], handR:[20,-38], kneeL:[-10,-18], footL:[-22,0], kneeR:[15,-17], footR:[28,0] }),
        frame(1, { head:[6,-87], neck:[6,-68], shoulder:[5,-62], hip:[4,-34], elbowL:[-10,-52], handL:[-4,-43], elbowR:[17,-49], handR:[20,-38], kneeL:[-10,-18], footL:[-22,0], kneeR:[15,-17], footR:[28,0] })
      ]
    },
    pitcherFieldReady: {
      duration: 1.5, loop: true,
      frames: [
        frame(0, { head:[6,-87], neck:[6,-68], shoulder:[5,-62], hip:[4,-34], elbowL:[-10,-52], handL:[-4,-43], elbowR:[17,-49], handR:[20,-38], kneeL:[-10,-18], footL:[-22,0], kneeR:[15,-17], footR:[28,0] }),
        frame(.5, { head:[6,-88], neck:[6,-69], shoulder:[5,-63], hip:[4,-35], elbowL:[-10,-53], handL:[-4,-44], elbowR:[17,-50], handR:[20,-39], kneeL:[-10,-19], footL:[-22,0], kneeR:[15,-18], footR:[28,0] }),
        frame(1, { head:[6,-87], neck:[6,-68], shoulder:[5,-62], hip:[4,-34], elbowL:[-10,-52], handL:[-4,-43], elbowR:[17,-49], handR:[20,-38], kneeL:[-10,-18], footL:[-22,0], kneeR:[15,-17], footR:[28,0] })
      ]
    },
    pitcherCatch: {
      duration: .82, loop: false, ease: "easeOut",
      frames: [
        frame(0, { head:[6,-87], neck:[6,-68], shoulder:[5,-62], hip:[4,-34], elbowL:[-10,-52], handL:[-4,-43], elbowR:[17,-49], handR:[20,-38], kneeL:[-10,-18], footL:[-22,0], kneeR:[15,-17], footR:[28,0] }),
        frame(.12, { head:[2,-87], neck:[2,-68], shoulder:[1,-62], hip:[2,-34], elbowL:[-13,-57], handL:[-14,-50], elbowR:[13,-54], handR:[16,-44], kneeL:[-13,-20], footL:[-24,0], kneeR:[17,-20], footR:[30,0] }, "snap"),
        frame(.27, { head:[-4,-84], neck:[-3,-65], shoulder:[-4,-59], hip:[-1,-32], elbowL:[-15,-59], handL:[-8,-57], elbowR:[9,-52], handR:[12,-43], kneeL:[-16,-21], footL:[-27,0], kneeR:[19,-20], footR:[31,0] }),
        frame(.46, { head:[-6,-82], neck:[-5,-63], shoulder:[-6,-57], hip:[-3,-31], elbowL:[-13,-57], handL:[-4,-55], elbowR:[6,-49], handR:[10,-41], kneeL:[-17,-21], footL:[-28,0], kneeR:[19,-20], footR:[32,0] }),
        frame(.68, { head:[-2,-85], neck:[-1,-66], shoulder:[-1,-60], hip:[0,-33], elbowL:[-11,-57], handL:[-1,-57], elbowR:[9,-52], handR:[3,-56], kneeL:[-15,-20], footL:[-27,0], kneeR:[18,-19], footR:[31,0] }),
        frame(1, { head:[1,-88], neck:[1,-69], shoulder:[1,-63], hip:[2,-35], elbowL:[-9,-57], handL:[0,-59], elbowR:[11,-56], handR:[3,-59], kneeL:[-14,-19], footL:[-26,0], kneeR:[17,-19], footR:[30,0] })
      ]
    },
    pitcherHit: {
      duration: .9, loop: false, ease: "easeOut",
      frames: [
        frame(0, { head:[6,-87], neck:[6,-68], shoulder:[5,-62], hip:[4,-34], elbowL:[-10,-52], handL:[-4,-43], elbowR:[17,-49], handR:[20,-38], kneeL:[-10,-18], footL:[-22,0], kneeR:[15,-17], footR:[28,0] }),
        frame(.1, { head:[0,-86], neck:[0,-67], shoulder:[-2,-61], hip:[1,-34], elbowL:[-9,-57], handL:[2,-52], elbowR:[14,-54], handR:[25,-43], kneeL:[-13,-20], footL:[-23,0], kneeR:[17,-20], footR:[29,0] }, "snap"),
        frame(.24, { head:[-11,-81], neck:[-10,-63], shoulder:[-10,-57], hip:[-4,-31], elbowL:[-12,-55], handL:[1,-48], elbowR:[8,-50], handR:[25,-35], kneeL:[-17,-22], footL:[-25,0], kneeR:[20,-21], footR:[31,0] }, "snap"),
        frame(.42, { head:[-15,-78], neck:[-14,-60], shoulder:[-13,-54], hip:[-7,-29], elbowL:[-15,-51], handL:[-2,-43], elbowR:[4,-46], handR:[22,-31], kneeL:[-19,-23], footL:[-27,0], kneeR:[21,-21], footR:[32,0] }),
        frame(.62, { head:[-10,-81], neck:[-9,-62], shoulder:[-8,-56], hip:[-4,-31], elbowL:[-13,-53], handL:[-1,-47], elbowR:[7,-49], handR:[18,-36], kneeL:[-18,-22], footL:[-27,0], kneeR:[20,-20], footR:[32,0] }),
        frame(.8, { head:[-3,-85], neck:[-2,-66], shoulder:[-2,-60], hip:[0,-33], elbowL:[-11,-55], handL:[-1,-51], elbowR:[10,-52], handR:[13,-43], kneeL:[-16,-20], footL:[-26,0], kneeR:[18,-19], footR:[31,0] }),
        frame(1, { head:[1,-87], neck:[1,-68], shoulder:[1,-62], hip:[2,-34], elbowL:[-10,-55], handL:[-1,-52], elbowR:[11,-53], handR:[13,-45], kneeL:[-15,-19], footL:[-26,0], kneeR:[18,-19], footR:[31,0] })
      ]
    },
    batterReady: {
      duration: 1.45, loop: true,
      frames: [
        frame(0, { head:[2,-90], neck:[1,-72], shoulder:[-1,-65], hip:[3,-34], kneeL:[-17,-18], footL:[-29,0], kneeR:[17,-18], footR:[29,0] }),
        frame(.5, { head:[2,-92], neck:[1,-74], shoulder:[-2,-67], hip:[2,-36], kneeL:[-18,-19], footL:[-30,0], kneeR:[18,-19], footR:[30,0] }),
        frame(1, { head:[2,-90], neck:[1,-72], shoulder:[-1,-65], hip:[3,-34], kneeL:[-17,-18], footL:[-29,0], kneeR:[17,-18], footR:[29,0] })
      ]
    },
    batterSwing: {
      // Twelve authored poses follow the supplied sheet row by row: stance,
      // two leg lifts, stride, load, hip fire, approach, extension, impact,
      // release, wrap and balanced finish. Mouse motion owns the swing plane.
      duration: .92, loop: false, ease: "smooth",
      frames: [
        frame(0,   { head:[3,-90], neck:[2,-72], shoulder:[0,-65], hip:[0,-34], kneeL:[-17,-18], footL:[-30,0], kneeR:[17,-18], footR:[30,0] }),
        frame(.09, { head:[2,-91], neck:[1,-73], shoulder:[-2,-66], hip:[-2,-35], kneeL:[-18,-18], footL:[-30,0], kneeR:[16,-23], footR:[27,-7] }),
        frame(.18, { head:[1,-93], neck:[0,-75], shoulder:[-5,-69], hip:[-5,-38], kneeL:[-17,-20], footL:[-30,0], kneeR:[9,-42], footR:[18,-38] }),
        frame(.3,  { head:[0,-91], neck:[-1,-73], shoulder:[-8,-67], hip:[-4,-36], kneeL:[-19,-18], footL:[-31,0], kneeR:[22,-23], footR:[39,0] }),
        frame(.39, { head:[1,-91], neck:[0,-73], shoulder:[-7,-67], hip:[-2,-35], kneeL:[-19,-18], footL:[-31,0], kneeR:[25,-20], footR:[40,0] }),
        frame(.48, { head:[1,-91], neck:[1,-72], shoulder:[-5,-66], hip:[2,-34], kneeL:[-18,-18], footL:[-30,0], kneeR:[25,-19], footR:[40,0] }),
        frame(.58, { head:[2,-91], neck:[3,-72], shoulder:[0,-66], hip:[7,-34], kneeL:[-17,-18], footL:[-30,0], kneeR:[24,-19], footR:[40,0] }),
        frame(.68, { head:[4,-90], neck:[5,-71], shoulder:[8,-64], hip:[11,-33], kneeL:[-15,-17], footL:[-29,0], kneeR:[23,-18], footR:[40,0] }),
        frame(.76, { head:[6,-89], neck:[8,-70], shoulder:[14,-61], hip:[12,-32], kneeL:[-13,-17], footL:[-28,0], kneeR:[22,-17], footR:[40,0] }, "snap"),
        frame(.84, { head:[8,-87], neck:[11,-68], shoulder:[19,-59], hip:[10,-31], kneeL:[-11,-16], footL:[-27,0], kneeR:[21,-16], footR:[39,0] }),
        frame(.92, { head:[10,-86], neck:[13,-67], shoulder:[20,-58], hip:[7,-31], kneeL:[-11,-16], footL:[-27,0], kneeR:[20,-16], footR:[37,0] }),
        frame(1,   { head:[7,-89], neck:[8,-70], shoulder:[10,-63], hip:[2,-34], kneeL:[-15,-18], footL:[-29,0], kneeR:[18,-18], footR:[34,0] })
      ]
    },
    batterMiss: {
      duration: .72, loop: false, ease: "easeOut",
      frames: [
        frame(0, { head:[9,-87], shoulder:[14,-60], hip:[4,-32], kneeL:[-9,-16], footL:[-23,0], kneeR:[20,-15], footR:[33,0] }),
        frame(.35, { head:[7,-84], neck:[5,-68], shoulder:[10,-59], hip:[2,-31], elbowL:[15,-47], handL:[27,-39], elbowR:[22,-43], handR:[34,-32], kneeL:[-12,-16], footL:[-25,0], kneeR:[18,-16], footR:[31,0] }),
        frame(1, { head:[3,-88], neck:[2,-70], shoulder:[4,-63], hip:[1,-34], elbowL:[-5,-52], handL:[8,-48], elbowR:[13,-51], handR:[23,-44], kneeL:[-15,-18], footL:[-27,0], kneeR:[16,-18], footR:[28,0] })
      ]
    },
    catcherReady: {
      duration: 1.7, loop: true,
      frames: [
        frame(0, { head:[1,-68], neck:[0,-51], shoulder:[0,-46], hip:[0,-24], elbowL:[8,-42], handL:[16,-38], elbowR:[-8,-42], handR:[-2,-38], kneeL:[-20,-15], footL:[-30,0], kneeR:[20,-15], footR:[30,0] }),
        frame(.5, { head:[1,-69], neck:[0,-52], shoulder:[0,-47], hip:[0,-25], elbowL:[8,-43], handL:[16,-39], elbowR:[-8,-43], handR:[-2,-39], kneeL:[-20,-16], footL:[-30,0], kneeR:[20,-16], footR:[30,0] }),
        frame(1, { head:[1,-68], neck:[0,-51], shoulder:[0,-46], hip:[0,-24], elbowL:[8,-42], handL:[16,-38], elbowR:[-8,-42], handR:[-2,-38], kneeL:[-20,-15], footL:[-30,0], kneeR:[20,-15], footR:[30,0] })
      ]
    },
    catcherReceive: {
      duration: .48, loop: false, ease: "easeOut",
      frames: [
        frame(0, { head:[1,-68], neck:[0,-51], shoulder:[0,-46], hip:[0,-24], elbowL:[8,-42], handL:[16,-38], elbowR:[-8,-42], handR:[-2,-38], kneeL:[-20,-15], footL:[-30,0], kneeR:[20,-15], footR:[30,0] }),
        frame(.16, { head:[1,-68], neck:[0,-51], shoulder:[1,-46], hip:[0,-24], elbowL:[11,-43], handL:[22,-39], elbowR:[-8,-42], handR:[-2,-38], kneeL:[-20,-15], footL:[-30,0], kneeR:[20,-15], footR:[30,0] }),
        frame(.34, { head:[2,-67], neck:[1,-50], shoulder:[2,-45], hip:[1,-23], elbowL:[15,-44], handL:[29,-40], elbowR:[-7,-41], handR:[-1,-37], kneeL:[-20,-14], footL:[-30,0], kneeR:[20,-14], footR:[30,0] }, "snap"),
        frame(.5, { head:[2,-65], neck:[1,-49], shoulder:[2,-44], hip:[1,-22], elbowL:[13,-43], handL:[25,-40], elbowR:[-7,-40], handR:[-1,-36], kneeL:[-21,-13], footL:[-30,0], kneeR:[20,-13], footR:[30,0] }),
        frame(.7, { head:[1,-67], neck:[0,-50], shoulder:[1,-45], hip:[0,-23], elbowL:[10,-42], handL:[20,-39], elbowR:[-8,-41], handR:[-2,-37], kneeL:[-20,-14], footL:[-30,0], kneeR:[20,-14], footR:[30,0] }),
        frame(.86, { head:[1,-68], neck:[0,-51], shoulder:[0,-46], hip:[0,-24], elbowL:[8,-42], handL:[16,-38], elbowR:[-8,-42], handR:[-2,-38], kneeL:[-20,-15], footL:[-30,0], kneeR:[20,-15], footR:[30,0] }),
        frame(1, { head:[1,-68], neck:[0,-51], shoulder:[0,-46], hip:[0,-24], elbowL:[8,-42], handL:[16,-38], elbowR:[-8,-42], handR:[-2,-38], kneeL:[-20,-15], footL:[-30,0], kneeR:[20,-15], footR:[30,0] })
      ]
    },
    catcherThrow: {
      duration: .84, loop: false, ease: "easeInOut",
      frames: [
        // Receive, close the glove, and bring both hands together at the chest.
        frame(0, { head:[1,-62], neck:[1,-46], shoulder:[1,-41], hip:[0,-20], elbowL:[12,-38], handL:[25,-33], elbowR:[-8,-35], handR:[-17,-29], kneeL:[-19,-13], footL:[-29,0], kneeR:[18,-13], footR:[29,0] }),
        frame(.1, { head:[1,-65], neck:[1,-49], shoulder:[1,-44], hip:[0,-23], elbowL:[8,-40], handL:[12,-39], elbowR:[-7,-40], handR:[8,-39], kneeL:[-18,-14], footL:[-29,0], kneeR:[18,-14], footR:[29,0] }),
        frame(.2, { head:[0,-71], neck:[0,-53], shoulder:[0,-48], hip:[0,-26], elbowL:[8,-44], handL:[5,-48], elbowR:[-8,-44], handR:[3,-48], kneeL:[-17,-16], footL:[-29,0], kneeR:[17,-16], footR:[29,0] }, "easeOut"),
        // Rise and coil: the bare hand travels behind the head in a readable arc.
        frame(.31, { head:[-1,-78], neck:[-1,-59], shoulder:[-2,-54], hip:[-1,-29], elbowL:[10,-47], handL:[17,-44], elbowR:[-12,-57], handR:[-19,-65], kneeL:[-16,-17], footL:[-29,0], kneeR:[16,-17], footR:[29,0] }),
        frame(.43, { head:[-2,-83], neck:[-2,-64], shoulder:[-4,-59], hip:[-2,-31], elbowL:[11,-50], handL:[20,-46], elbowR:[-18,-66], handR:[-29,-75], kneeL:[-15,-18], footL:[-29,0], kneeR:[16,-18], footR:[29,0] }, "easeIn"),
        frame(.52, { head:[-1,-84], neck:[0,-65], shoulder:[0,-60], hip:[0,-32], elbowL:[10,-50], handL:[17,-46], elbowR:[-8,-72], handR:[-14,-82], kneeL:[-15,-18], footL:[-29,0], kneeR:[17,-18], footR:[30,0] }),
        // Elbow leads, then the hand releases directly toward the pitcher.
        frame(.62, { head:[3,-82], neck:[5,-63], shoulder:[7,-58], hip:[3,-31], elbowL:[7,-47], handL:[1,-43], elbowR:[22,-68], handR:[45,-57], kneeL:[-14,-18], footL:[-29,0], kneeR:[18,-17], footR:[30,0] }, "snap"),
        frame(.72, { head:[6,-78], neck:[8,-59], shoulder:[10,-54], hip:[5,-29], elbowL:[5,-44], handL:[-2,-40], elbowR:[29,-55], handR:[42,-38], kneeL:[-14,-17], footL:[-28,0], kneeR:[19,-16], footR:[30,0] }),
        frame(.82, { head:[7,-73], neck:[9,-55], shoulder:[11,-50], hip:[5,-27], elbowL:[4,-42], handL:[-3,-37], elbowR:[25,-43], handR:[34,-27], kneeL:[-14,-16], footL:[-28,0], kneeR:[19,-15], footR:[30,0] }, "easeOut"),
        frame(.92, { head:[4,-68], neck:[5,-51], shoulder:[6,-46], hip:[3,-25], elbowL:[7,-40], handL:[3,-35], elbowR:[13,-40], handR:[20,-31], kneeL:[-16,-15], footL:[-29,0], kneeR:[19,-14], footR:[30,0] }),
        frame(1, { head:[1,-64], neck:[1,-48], shoulder:[1,-43], hip:[0,-22], elbowL:[10,-39], handL:[22,-33], elbowR:[-9,-37], handR:[-18,-30], kneeL:[-18,-14], footL:[-29,0], kneeR:[18,-14], footR:[29,0] })
      ]
    },
    pitcherReceive: {
      duration: .9, loop: false, ease: "easeInOut",
      frames: [
        frame(0, { head:[1,-91], neck:[0,-72], shoulder:[-2,-66], hip:[2,-35], elbowL:[-17,-57], handL:[-5,-61], elbowR:[15,-56], handR:[5,-60], kneeL:[-11,-18], footL:[-20,0], kneeR:[11,-18], footR:[20,0] }),
        frame(.16, { head:[0,-91], neck:[-1,-72], shoulder:[-3,-66], hip:[1,-35], elbowL:[1,-61], handL:[18,-60], elbowR:[11,-56], handR:[3,-59], kneeL:[-12,-18], footL:[-21,0], kneeR:[12,-18], footR:[21,0] }),
        // With facing=-1, positive local X reaches screen-left toward catcher.
        frame(.35, { head:[-1,-91], neck:[-2,-72], shoulder:[-4,-66], hip:[0,-35], elbowL:[20,-62], handL:[38,-58], elbowR:[7,-56], handR:[-1,-58], kneeL:[-12,-18], footL:[-21,0], kneeR:[12,-18], footR:[21,0] }, "easeIn"),
        frame(.52, { head:[-2,-90], neck:[-3,-71], shoulder:[-5,-65], hip:[-1,-34], elbowL:[26,-60], handL:[45,-54], elbowR:[6,-54], handR:[-2,-56], kneeL:[-13,-18], footL:[-22,0], kneeR:[12,-18], footR:[21,0] }),
        frame(.68, { head:[-3,-89], neck:[-4,-70], shoulder:[-6,-64], hip:[-1,-34], elbowL:[29,-57], handL:[48,-49], elbowR:[5,-53], handR:[-3,-55], kneeL:[-13,-18], footL:[-22,0], kneeR:[12,-18], footR:[21,0] }, "snap"),
        frame(.76, { head:[-2,-89], neck:[-3,-70], shoulder:[-5,-64], hip:[0,-34], elbowL:[22,-58], handL:[37,-54], elbowR:[6,-54], handR:[-2,-56], kneeL:[-13,-18], footL:[-22,0], kneeR:[12,-18], footR:[21,0] }),
        // Absorb the catch back into the chest before the next set position.
        frame(.84, { head:[0,-90], neck:[0,-71], shoulder:[-2,-65], hip:[1,-35], elbowL:[12,-58], handL:[7,-52], elbowR:[10,-57], handR:[3,-61], kneeL:[-12,-18], footL:[-21,0], kneeR:[12,-18], footR:[21,0] }, "easeOut"),
        frame(.93, { head:[1,-91], neck:[0,-72], shoulder:[-2,-66], hip:[2,-35], elbowL:[-6,-55], handL:[-3,-58], elbowR:[13,-56], handR:[4,-60], kneeL:[-11,-18], footL:[-20,0], kneeR:[11,-18], footR:[20,0] }),
        frame(1, { head:[1,-91], neck:[0,-72], shoulder:[-2,-66], hip:[2,-35], elbowL:[-17,-57], handL:[-5,-61], elbowR:[15,-56], handR:[5,-60], kneeL:[-11,-18], footL:[-20,0], kneeR:[11,-18], footR:[20,0] })
      ]
    },
    pitcherTransfer: {
      duration: .56, loop: false, ease: "easeInOut",
      frames: [
        frame(0, { head:[1,-91], neck:[0,-72], shoulder:[-2,-66], hip:[2,-35], elbowL:[-8,-58], handL:[-3,-58], elbowR:[13,-56], handR:[4,-60], kneeL:[-11,-18], footL:[-20,0], kneeR:[11,-18], footR:[20,0] }),
        frame(.22, { head:[1,-91], neck:[0,-72], shoulder:[-2,-66], hip:[2,-35], elbowL:[-2,-59], handL:[3,-61], elbowR:[8,-58], handR:[2,-61], kneeL:[-11,-18], footL:[-20,0], kneeR:[11,-18], footR:[20,0] }),
        frame(.46, { head:[0,-92], neck:[-1,-73], shoulder:[-3,-67], hip:[1,-36], elbowL:[1,-60], handL:[2,-62], elbowR:[5,-59], handR:[2,-62], kneeL:[-12,-19], footL:[-20,0], kneeR:[11,-19], footR:[20,0] }),
        frame(.7, { head:[0,-92], neck:[-1,-73], shoulder:[-3,-67], hip:[1,-36], elbowL:[-4,-59], handL:[-1,-61], elbowR:[8,-58], handR:[4,-62], kneeL:[-12,-19], footL:[-20,0], kneeR:[11,-19], footR:[20,0] }),
        frame(1, { head:[1,-91], neck:[0,-72], shoulder:[-2,-66], hip:[2,-35], elbowL:[-17,-57], handL:[-5,-61], elbowR:[15,-56], handR:[5,-60], kneeL:[-11,-18], footL:[-20,0], kneeR:[11,-18], footR:[20,0] })
      ]
    },
    fielderReady: {
      duration: 1.6, loop: true,
      frames: [
        frame(0, { head:[0,-88], shoulder:[0,-63], hip:[0,-33], elbowL:[-19,-51], handL:[-27,-37], elbowR:[19,-51], handR:[27,-37], kneeL:[-18,-17], footL:[-29,0], kneeR:[18,-17], footR:[29,0] }),
        frame(.5, { head:[0,-90], shoulder:[0,-65], hip:[0,-35], elbowL:[-20,-53], handL:[-28,-39], elbowR:[20,-53], handR:[28,-39], kneeL:[-19,-18], kneeR:[19,-18] }),
        frame(1, { head:[0,-88], shoulder:[0,-63], hip:[0,-33], elbowL:[-19,-51], handL:[-27,-37], elbowR:[19,-51], handR:[27,-37], kneeL:[-18,-17], footL:[-29,0], kneeR:[18,-17], footR:[29,0] })
      ]
    },
    fielderRun: {
      duration: .5, loop: true, ease: "snap",
      frames: [
        frame(0, { head:[2,-89], shoulder:[4,-64], hip:[0,-34], elbowL:[-15,-55], handL:[-27,-45], elbowR:[18,-52], handR:[29,-39], kneeL:[-16,-19], footL:[-30,0], kneeR:[18,-14], footR:[27,0] }),
        frame(.25, { head:[3,-90], shoulder:[5,-65], hip:[3,-36], elbowL:[-5,-51], handL:[9,-42], elbowR:[16,-59], handR:[27,-69], kneeL:[-3,-23], footL:[8,0], kneeR:[12,-25], footR:[28,-5] }),
        frame(.5, { head:[2,-89], shoulder:[4,-64], hip:[0,-34], elbowL:[18,-52], handL:[29,-39], elbowR:[-15,-55], handR:[-27,-45], kneeL:[18,-14], footL:[27,0], kneeR:[-16,-19], footR:[-30,0] }),
        frame(.75, { head:[3,-90], shoulder:[5,-65], hip:[-3,-36], elbowL:[16,-59], handL:[27,-69], elbowR:[-5,-51], handR:[9,-42], kneeL:[12,-25], footL:[28,-5], kneeR:[-3,-23], footR:[8,0] }),
        frame(1, { head:[2,-89], shoulder:[4,-64], hip:[0,-34], elbowL:[-15,-55], handL:[-27,-45], elbowR:[18,-52], handR:[29,-39], kneeL:[-16,-19], footL:[-30,0], kneeR:[18,-14], footR:[27,0] })
      ]
    },
    fielderCatch: {
      duration: .52, loop: false,
      frames: [
        frame(0, { elbowL:[-19,-51], handL:[-27,-37], elbowR:[19,-51], handR:[27,-37], kneeL:[-18,-17], kneeR:[18,-17] }),
        frame(.38, { head:[-2,-91], shoulder:[-1,-66], hip:[1,-34], elbowL:[-22,-70], handL:[-10,-84], elbowR:[14,-70], handR:[-6,-84], kneeL:[-15,-17], kneeR:[16,-18] }),
        frame(.7, { head:[0,-92], shoulder:[0,-67], elbowL:[-15,-74], handL:[-3,-88], elbowR:[14,-74], handR:[2,-88], kneeL:[-14,-18], kneeR:[15,-18] }),
        frame(1, { head:[0,-90], shoulder:[0,-65], elbowL:[-17,-62], handL:[-5,-72], elbowR:[16,-62], handR:[4,-72] })
      ]
    },
    fielderGround: {
      duration: .5, loop: false, ease: "easeOut",
      frames: [
        frame(0, { head:[0,-88], shoulder:[0,-63], hip:[0,-33], handL:[-27,-37], handR:[27,-37], kneeL:[-18,-17], footL:[-29,0], kneeR:[18,-17], footR:[29,0] }),
        frame(.52, { head:[-2,-76], shoulder:[-1,-51], hip:[1,-26], elbowL:[-20,-34], handL:[-8,-15], elbowR:[16,-35], handR:[5,-14], kneeL:[-20,-13], footL:[-29,0], kneeR:[19,-13], footR:[29,0] }, "snap"),
        frame(1, { head:[0,-80], shoulder:[0,-55], hip:[0,-28], elbowL:[-16,-40], handL:[-5,-23], elbowR:[15,-40], handR:[5,-22], kneeL:[-19,-14], footL:[-29,0], kneeR:[19,-14], footR:[29,0] })
      ]
    },
    fielderMiss: {
      duration: .62, loop: false,
      frames: [
        frame(0, { head:[0,-89], shoulder:[0,-64], hip:[0,-34], handL:[-25,-40], handR:[25,-40], footL:[-28,0], footR:[28,0] }),
        frame(.42, { head:[-4,-87], shoulder:[-7,-61], hip:[-2,-32], elbowL:[-25,-58], handL:[-37,-51], elbowR:[11,-49], handR:[22,-40], kneeL:[-20,-16], footL:[-31,0], kneeR:[15,-17], footR:[27,0] }, "snap"),
        frame(1, { head:[-2,-88], shoulder:[-3,-63], hip:[0,-34], elbowL:[-18,-52], handL:[-29,-43], elbowR:[17,-51], handR:[27,-41], kneeL:[-18,-17], footL:[-29,0], kneeR:[17,-17], footR:[28,0] })
      ]
    }
  };

  const expandedFrameCache = new WeakMap();

  function expandedFrames(clip) {
    if (expandedFrameCache.has(clip)) return expandedFrameCache.get(clip);
    const result = clip.frames.map((sourceFrame, index) => {
      const joints = {};
      for (const joint of Object.keys(base)) {
        if (sourceFrame.joints[joint]) {
          joints[joint] = [...sourceFrame.joints[joint]];
          continue;
        }
        let previousIndex = index - 1;
        let nextIndex = index + 1;
        while (previousIndex >= 0 && !clip.frames[previousIndex].joints[joint]) previousIndex--;
        while (nextIndex < clip.frames.length && !clip.frames[nextIndex].joints[joint]) nextIndex++;
        const previous = previousIndex >= 0 ? clip.frames[previousIndex] : null;
        const next = nextIndex < clip.frames.length ? clip.frames[nextIndex] : null;
        if (previous && next) {
          const span = Math.max(.0001, next.at - previous.at);
          const mix = Math.max(0, Math.min(1, (sourceFrame.at - previous.at) / span));
          joints[joint] = [
            previous.joints[joint][0] + (next.joints[joint][0] - previous.joints[joint][0]) * mix,
            previous.joints[joint][1] + (next.joints[joint][1] - previous.joints[joint][1]) * mix
          ];
        } else if (previous) {
          joints[joint] = [...previous.joints[joint]];
        } else if (next) {
          joints[joint] = [...next.joints[joint]];
        } else {
          joints[joint] = [...base[joint]];
        }
      }
      return { ...sourceFrame, joints };
    });
    expandedFrameCache.set(clip, result);
    return result;
  }

  function hermite(a, b, tangentA, tangentB, t, span) {
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * a
      + (t3 - 2 * t2 + t) * tangentA * span
      + (-2 * t3 + 3 * t2) * b
      + (t3 - t2) * tangentB * span;
  }

  function pose(name, seconds) {
    const clip = clips[name] || clips.idle;
    const frames = expandedFrames(clip);
    let local = seconds / clip.duration;
    local = clip.loop ? ((local % 1) + 1) % 1 : Math.max(0, Math.min(1, local));
    let frameIndex = 0;
    let a = frames[0];
    let b = frames[frames.length - 1];
    for (let i = 0; i < frames.length - 1; i++) {
      if (local >= frames[i].at && local <= frames[i + 1].at) {
        frameIndex = i; a = frames[i]; b = frames[i + 1]; break;
      }
    }
    const span = Math.max(.0001, b.at - a.at);
    const rawMix = Math.max(0, Math.min(1, (local - a.at) / span));
    const previous = frames[Math.max(0, frameIndex - 1)];
    const next = frames[Math.min(frames.length - 1, frameIndex + 2)];
    const pa = a.joints;
    const pb = b.joints;
    const pp = previous.joints;
    const pn = next.joints;
    const previousSpan = Math.max(.0001, b.at - previous.at);
    const nextSpan = Math.max(.0001, next.at - a.at);
    const result = {};
    for (const joint of Object.keys(base)) {
      result[joint] = [0, 0];
      for (let axis = 0; axis < 2; axis++) {
        // Continuous Hermite tangents carry velocity through a key pose. The
        // authored spacing now creates acceleration without stopping at every
        // 10-12 FPS drawing as the old per-segment smoothstep did.
        const tangentA = (pb[joint][axis] - pp[joint][axis]) / previousSpan;
        const tangentB = (pn[joint][axis] - pa[joint][axis]) / nextSpan;
        const value = hermite(pa[joint][axis], pb[joint][axis], tangentA, tangentB, rawMix, span);
        const margin = name.startsWith("batter") || name.startsWith("catcher") ? .75 : 2.5;
        result[joint][axis] = Math.max(
          Math.min(pa[joint][axis], pb[joint][axis]) - margin,
          Math.min(Math.max(pa[joint][axis], pb[joint][axis]) + margin, value)
        );
      }
    }
    return result;
  }

  function line(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  }

  function skeletonFor(name) {
    if (name.startsWith("pitcher")) return { upperArm: 24, lowerArm: 20, upperLeg: 21, lowerLeg: 20, neck: 6, head: 19, shoulderWidth: 4.5, hipWidth: 3.5, armSideL: 0, armSideR: 0, legSideL: 1, legSideR: -1 };
    if (name.startsWith("catcher")) return { upperArm: 21, lowerArm: 18, upperLeg: 21, lowerLeg: 20, neck: 5, head: 18, shoulderWidth: 4, hipWidth: 3, swapArmRoots: true, armSideL: 0, armSideR: 0, legSideL: 1, legSideR: -1 };
    if (name.startsWith("batter")) return { upperArm: 22, lowerArm: 19, upperLeg: 22, lowerLeg: 21, neck: 7, head: 18, shoulderWidth: 4.5, hipWidth: 3.5, armSideL: 0, armSideR: 0, legSideL: 1, legSideR: -1 };
    return { upperArm: 24, lowerArm: 20, upperLeg: 22, lowerLeg: 21, neck: 6, head: 19, shoulderWidth: 7, hipWidth: 4, armSideL: 1, armSideR: -1, legSideL: 1, legSideR: -1, foldedL: [-.65, .76], foldedR: [.65, .76] };
  }

  function direction(from, to, fallback = [0, -1]) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    return length > .001 ? [dx / length, dy / length] : fallback;
  }

  function directionBlend(from, to, amount) {
    const fromAngle = Math.atan2(from[1], from[0]);
    const toAngle = Math.atan2(to[1], to[0]);
    const delta = Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));
    const angle = fromAngle + delta * amount;
    return [Math.cos(angle), Math.sin(angle)];
  }

  function fixedChain(root, authoredJoint, authoredTarget, upperLength, lowerLength) {
    const direct = direction(root, authoredTarget);
    const jointDistance = Math.hypot(authoredJoint[0] - root[0], authoredJoint[1] - root[1]);
    const authoredUpper = direction(root, authoredJoint, direct);
    const upperWeight = Math.max(0, Math.min(1, (jointDistance - 10) / 10));
    const upperDirection = directionBlend(direct, authoredUpper, upperWeight);
    const lowerDistance = Math.hypot(authoredTarget[0] - authoredJoint[0], authoredTarget[1] - authoredJoint[1]);
    const authoredLower = direction(authoredJoint, authoredTarget, upperDirection);
    const lowerWeight = Math.max(0, Math.min(1, (lowerDistance - 8) / 10));
    const lowerDirection = directionBlend(upperDirection, authoredLower, lowerWeight);
    const joint = [root[0] + upperDirection[0] * upperLength, root[1] + upperDirection[1] * upperLength];
    return {
      joint,
      target: [joint[0] + lowerDirection[0] * lowerLength, joint[1] + lowerDirection[1] * lowerLength]
    };
  }

  function solveJoint(root, target, upperLength, lowerLength, hint, bendSide = 0, foldedDirection = null) {
    const targetDx = target[0] - root[0];
    const targetDy = target[1] - root[1];
    const authoredDistance = Math.hypot(targetDx, targetDy);
    const targetDirection = direction(root, target, foldedDirection || direction(root, hint));
    const stability = foldedDirection ? Math.max(0, Math.min(1, (authoredDistance - 8) / 16)) : 1;
    const stableDirection = foldedDirection ? directionBlend(foldedDirection, targetDirection, stability) : targetDirection;
    const rawDistance = Math.max(6, authoredDistance);
    const dx = stableDirection[0] * rawDistance;
    const dy = stableDirection[1] * rawDistance;
    const distance = Math.max(Math.abs(upperLength - lowerLength) + .001, Math.min(upperLength + lowerLength - .001, rawDistance));
    const ux = dx / rawDistance;
    const uy = dy / rawDistance;
    const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    const baseX = root[0] + ux * along;
    const baseY = root[1] + uy * along;
    const candidateA = [baseX - uy * bend, baseY + ux * bend];
    const candidateB = [baseX + uy * bend, baseY - ux * bend];
    const distanceA = Math.hypot(candidateA[0] - hint[0], candidateA[1] - hint[1]);
    const distanceB = Math.hypot(candidateB[0] - hint[0], candidateB[1] - hint[1]);
    const solvedTarget = [root[0] + ux * distance, root[1] + uy * distance];
    return {
      joint: bendSide > 0 ? candidateA : bendSide < 0 ? candidateB : distanceA <= distanceB ? candidateA : candidateB,
      target: solvedTarget
    };
  }

  function attachmentsFor(p, skeleton = null, rigOptions = null) {
    const torsoX = p.shoulder[0] - p.hip[0];
    const torsoY = p.shoulder[1] - p.hip[1];
    const torsoLength = Math.hypot(torsoX, torsoY) || 1;
    const sideX = -torsoY / torsoLength;
    const sideY = torsoX / torsoLength;
    const bodyTurn = Math.max(0, Math.min(1, rigOptions?.bodyTurn ?? 0));
    // A torso turning toward/away from the camera occupies less horizontal
    // screen space. The previous implementation expanded these widths, which
    // contradicted the bat's perspective and made the batter's arms split.
    const shoulderWidth = (skeleton?.shoulderWidth ?? 7) * (1 - bodyTurn * .52);
    const hipWidth = (skeleton?.hipWidth ?? 4) * (1 - bodyTurn * .34);
    const leftRootSign = skeleton?.swapArmRoots ? 1 : -1;
    return {
      shoulderL: [p.shoulder[0] + sideX * shoulderWidth * leftRootSign, p.shoulder[1] + sideY * shoulderWidth * leftRootSign],
      shoulderR: [p.shoulder[0] - sideX * shoulderWidth * leftRootSign, p.shoulder[1] - sideY * shoulderWidth * leftRootSign],
      hipL: [p.hip[0] - sideX * hipWidth, p.hip[1] - sideY * hipWidth],
      hipR: [p.hip[0] + sideX * hipWidth, p.hip[1] + sideY * hipWidth]
    };
  }

  const armTrackCache = new WeakMap();

  function armTracks(name, clip) {
    if (armTrackCache.has(clip)) return armTrackCache.get(clip);
    const frames = expandedFrames(clip);
    const result = { L: [], R: [] };
    for (const side of ["L", "R"]) {
      const values = frames.map((sourceFrame) => {
        const p = sourceFrame.joints;
        const root = attachmentsFor(p, skeletonFor(name))[`shoulder${side}`];
        const hand = p[`hand${side}`];
        const dx = hand[0] - root[0];
        const dy = hand[1] - root[1];
        const distance = Math.hypot(dx, dy);
        return { at: sourceFrame.at, angle: distance >= 8 ? Math.atan2(dy, dx) : null, distance: Math.max(6, distance) };
      });
      for (let index = 0; index < values.length; index++) {
        if (values[index].angle !== null) continue;
        let previous = index - 1;
        let next = index + 1;
        while (previous >= 0 && values[previous].angle === null) previous--;
        while (next < values.length && values[next].angle === null) next++;
        values[index].angle = previous >= 0 ? values[previous].angle : next < values.length ? values[next].angle : (side === "L" ? 2.4 : .74);
      }
      for (let index = 1; index < values.length; index++) {
        const previousAngle = values[index - 1].angle;
        const delta = Math.atan2(Math.sin(values[index].angle - previousAngle), Math.cos(values[index].angle - previousAngle));
        values[index].angle = previousAngle + delta;
      }
      result[side] = values;
    }
    armTrackCache.set(clip, result);
    return result;
  }

  function sampleTrack(values, local, property) {
    let index = 0;
    for (let i = 0; i < values.length - 1; i++) {
      if (local >= values[i].at && local <= values[i + 1].at) { index = i; break; }
    }
    const a = values[index];
    const b = values[Math.min(values.length - 1, index + 1)];
    const previous = values[Math.max(0, index - 1)];
    const next = values[Math.min(values.length - 1, index + 2)];
    const span = Math.max(.0001, b.at - a.at);
    const mix = Math.max(0, Math.min(1, (local - a.at) / span));
    const tangentA = (b[property] - previous[property]) / Math.max(.0001, b.at - previous.at);
    const tangentB = (next[property] - a[property]) / Math.max(.0001, next.at - a.at);
    const value = hermite(a[property], b[property], tangentA, tangentB, mix, span);
    const margin = property === "angle" ? .1 : 1.5;
    return Math.max(Math.min(a[property], b[property]) - margin, Math.min(Math.max(a[property], b[property]) + margin, value));
  }

  function trackedArmTarget(name, seconds, side, root, maximumReach) {
    const clip = clips[name] || clips.idle;
    let local = seconds / clip.duration;
    local = clip.loop ? ((local % 1) + 1) % 1 : Math.max(0, Math.min(1, local));
    const values = armTracks(name, clip)[side];
    const angle = sampleTrack(values, local, "angle");
    const distance = Math.max(6, Math.min(maximumReach - .001, sampleTrack(values, local, "distance")));
    return [root[0] + Math.cos(angle) * distance, root[1] + Math.sin(angle) * distance];
  }

  function reachableFoot(root, target, maximumReach) {
    if (target[1] < -.5) return target;
    const vertical = -root[1];
    const horizontalReach = Math.sqrt(Math.max(0, maximumReach * maximumReach - vertical * vertical));
    return [Math.max(root[0] - horizontalReach, Math.min(root[0] + horizontalReach, target[0])), 0];
  }

  function solveRig(p, name, overrides = null, seconds = 0, rigOptions = null) {
    const skeleton = skeletonFor(name);
    const { shoulderL, shoulderR, hipL, hipR } = attachmentsFor(p, skeleton, rigOptions);

    const neckDirection = direction(p.shoulder, p.neck);
    p.neck = [p.shoulder[0] + neckDirection[0] * skeleton.neck, p.shoulder[1] + neckDirection[1] * skeleton.neck];
    const headDirection = direction(p.neck, p.head);
    p.head = [p.neck[0] + headDirection[0] * skeleton.head, p.neck[1] + headDirection[1] * skeleton.head];

    const targetL = overrides?.handL ? p.handL : trackedArmTarget(name, seconds, "L", shoulderL, skeleton.upperArm + skeleton.lowerArm);
    const targetR = overrides?.handR ? p.handR : trackedArmTarget(name, seconds, "R", shoulderR, skeleton.upperArm + skeleton.lowerArm);
    const depth = Math.max(0, Math.min(1, Math.abs(rigOptions?.depth ?? 0)));
    const projectedArmScale = (root, target, hasOverride, side) => {
      if (!hasOverride) return 1;
      const authoredLength = skeleton.upperArm + skeleton.lowerArm;
      const targetDistance = Math.hypot(target[0] - root[0], target[1] - root[1]);
      const armDepth = Math.max(0, Math.min(1, rigOptions?.[`armDepth${side}`] ?? depth));
      const depthScale = 1 - armDepth * .34;
      const reachScale = (targetDistance + 2.5) / Math.max(1, authoredLength);
      return Math.max(.64, Math.min(1, Math.max(depthScale, reachScale)));
    };
    const lockArms = Boolean(rigOptions?.lockArms && overrides?.elbowL && overrides?.elbowR && overrides?.handL && overrides?.handR);
    const armScaleL = projectedArmScale(shoulderL, targetL, Boolean(overrides?.handL), "L");
    const armScaleR = projectedArmScale(shoulderR, targetR, Boolean(overrides?.handR), "R");
    const armL = lockArms
      ? { joint: [...overrides.elbowL], target: [...overrides.handL] }
      : solveJoint(shoulderL, targetL, skeleton.upperArm * armScaleL, skeleton.lowerArm * armScaleL, p.elbowL, skeleton.armSideL);
    const armR = lockArms
      ? { joint: [...overrides.elbowR], target: [...overrides.handR] }
      : solveJoint(shoulderR, targetR, skeleton.upperArm * armScaleR, skeleton.lowerArm * armScaleR, p.elbowR, skeleton.armSideR);
    const footL = reachableFoot(hipL, p.footL, skeleton.upperLeg + skeleton.lowerLeg - .001);
    const footR = reachableFoot(hipR, p.footR, skeleton.upperLeg + skeleton.lowerLeg - .001);
    const legL = solveJoint(hipL, footL, skeleton.upperLeg, skeleton.lowerLeg, p.kneeL, skeleton.legSideL);
    const legR = solveJoint(hipR, footR, skeleton.upperLeg, skeleton.lowerLeg, p.kneeR, skeleton.legSideR);
    p.elbowL = armL.joint; p.handL = armL.target;
    p.elbowR = armR.joint; p.handR = armR.target;
    p.kneeL = legL.joint; p.footL = legL.target;
    p.kneeR = legR.joint; p.footR = legR.target;
    return { p, shoulderL, shoulderR, hipL, hipR };
  }

  function resolvedPose(name, seconds, overrides = null, rigOptions = null) {
    const p = pose(name, seconds);
    if (overrides) {
      for (const [joint, value] of Object.entries(overrides)) {
        if (p[joint] && Array.isArray(value)) p[joint] = value;
      }
    }
    solveRig(p, name, overrides, seconds, rigOptions);
    return p;
  }

  function draw(ctx, options) {
    const { x, ground, scale = 1, facing = 1, clip = "idle", time = 0, glove = false, overrides = null, rigOptions = null } = options;
    const p = pose(clip, time);
    if (overrides) {
      for (const [joint, value] of Object.entries(overrides)) {
        if (p[joint] && Array.isArray(value)) p[joint] = value;
      }
    }
    const { shoulderL, shoulderR, hipL, hipR } = solveRig(p, clip, overrides, time, rigOptions);
    const map = (joint) => [p[joint][0] * facing, p[joint][1]];
    const mapPoint = (point) => [point[0] * facing, point[1]];
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const ink = darkMode ? "#f7f7f5" : "#050505";
    const rim = darkMode ? "rgba(0,0,0,.5)" : "rgba(255,255,255,.48)";
    const depthCue = Math.max(0, Math.min(1, rigOptions?.depthCue ?? (rigOptions?.frontArm ? 1 : 0)));
    const gray = (value, warm = 0) => {
      const channel = Math.round(Math.max(0, Math.min(255, value)));
      return `rgb(${channel},${channel},${Math.max(0, channel - warm)})`;
    };
    // Keep the torso between the two arm planes. The characters are tiny, so
    // the old 15-25 level difference vanished after display scaling.
    const torsoInk = depthCue
      ? darkMode ? gray(247 - 42 * depthCue, 2) : gray(5 + 38 * depthCue)
      : ink;

    ctx.save();
    ctx.translate(x, ground);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const fallbackFront = rigOptions?.frontArm || null;
    const armZL = Math.max(-1, Math.min(1, rigOptions?.armZL ?? (fallbackFront ? (fallbackFront === "L" ? .55 : -.55) : 0)));
    const armZR = Math.max(-1, Math.min(1, rigOptions?.armZR ?? (fallbackFront ? (fallbackFront === "R" ? .55 : -.55) : 0)));
    const hasArmDepth = depthCue > 0 && Math.abs(armZL - armZR) > .015;
    const frontArm = hasArmDepth ? (armZL >= armZR ? "L" : "R") : null;
    const armOrder = frontArm === "L" ? ["R", "L"] : ["L", "R"];
    const armColor = (side) => {
      if (!hasArmDepth) return ink;
      const z = side === "L" ? armZL : armZR;
      const torsoChannel = darkMode ? 247 - 42 * depthCue : 5 + 38 * depthCue;
      return darkMode
        ? gray(torsoChannel + z * 92 * depthCue, 2)
        : gray(torsoChannel + z * 78 * depthCue);
    };
    const drawArm = (side) => line(ctx, [mapPoint(side === "L" ? shoulderL : shoulderR), map(`elbow${side}`), map(`hand${side}`)]);
    const drawLeg = (side) => line(ctx, [mapPoint(side === "L" ? hipL : hipR), map(`knee${side}`), map(`foot${side}`)]);
    const limbGradient = (root, end, color) => {
      if (!depthCue) return color;
      const gradient = ctx.createLinearGradient(root[0], root[1], end[0], end[1]);
      gradient.addColorStop(0, torsoInk);
      gradient.addColorStop(.24, color);
      gradient.addColorStop(1, color);
      return gradient;
    };
    const armStroke = (side) => limbGradient(mapPoint(side === "L" ? shoulderL : shoulderR), map(`hand${side}`), armColor(side));

    if (clip === "pitcherThrow" && time > .12 && time < .62) {
      const previous = resolvedPose(clip, Math.max(0, time - 1 / 12));
      const prevMap = (joint) => [previous[joint][0] * facing, previous[joint][1]];
      ctx.save();
      ctx.globalAlpha = .2;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 14;
      line(ctx, [prevMap("elbowR"), prevMap("handR"), map("handR")]);
      ctx.restore();
    }

    // A faint rim keeps a black figure readable on dark wallpapers while the
    // visible character itself remains a plain black stick figure.
    ctx.strokeStyle = rim;
    ctx.lineWidth = 12;
    line(ctx, [mapPoint([p.head[0], p.head[1] + 14]), map("neck")]);
    line(ctx, [mapPoint(shoulderL), map("shoulder"), mapPoint(shoulderR)]);
    line(ctx, [mapPoint(hipL), map("hip"), mapPoint(hipR)]);
    line(ctx, [map("neck"), map("shoulder"), map("hip")]);
    for (const side of armOrder) drawArm(side);
    drawLeg("L");
    drawLeg("R");

    ctx.lineWidth = 8;
    if (frontArm) {
      ctx.strokeStyle = armStroke(armOrder[0]);
      drawArm(armOrder[0]);
    }
    ctx.strokeStyle = torsoInk;
    line(ctx, [mapPoint([p.head[0], p.head[1] + 14]), map("neck")]);
    line(ctx, [mapPoint(shoulderL), map("shoulder"), mapPoint(shoulderR)]);
    line(ctx, [mapPoint(hipL), map("hip"), mapPoint(hipR)]);
    line(ctx, [map("neck"), map("shoulder"), map("hip")]);
    drawLeg("L");
    drawLeg("R");
    if (frontArm) {
      ctx.strokeStyle = armStroke(frontArm);
      drawArm(frontArm);
    } else {
      ctx.strokeStyle = ink;
      for (const side of armOrder) drawArm(side);
    }

    const head = map("head");
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(head[0], head[1], 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = torsoInk;
    ctx.beginPath(); ctx.arc(head[0], head[1], 14, 0, Math.PI * 2); ctx.fill();

    if (glove) {
      const hand = map("handL");
      const gloveAngle = -.35 * facing;
      ctx.fillStyle = "#a45d28";
      ctx.strokeStyle = "#3b1c0c";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(hand[0], hand[1], 10.2, 8.3, gloveAngle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c47736";
      ctx.beginPath();
      ctx.ellipse(hand[0] + facing * 4.2, hand[1] - 1.2, 4.8, 3.2, gloveAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(55,24,8,.82)";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(hand[0] - facing * 1.2, hand[1], 4.4, -.9, .92);
      ctx.stroke();
    }
    ctx.restore();
  }

  const ink = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "#f7f7f5" : "#050505";
  window.StickMotion = { clips, pose, resolvedPose, draw, ink };
})();
