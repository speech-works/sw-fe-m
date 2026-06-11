import React from "react";
import { FaceShell, SprayShoot, CorkPop, SvgIconProps, Path, G, Circle, Ellipse, Polygon } from "./faceKit";

const CelebrateFace = (props: SvgIconProps) => (
  <FaceShell bg="#4A148C" {...props}>
    <G transform="translate(24, 24) rotate(40) scale(0.45)">

      {/* 1. Yellow Starburst (Behind) */}
      <SprayShoot tx={0} ty={0} delay={0}>
        <Path d="M 0 -5 L 15 -25 L 20 -10 L 40 -15 L 25 5 L 45 25 L 20 15 L 5 40 L -5 20 L -25 25 L -15 5 L -35 -15 L -10 -10 Z" fill="#FFF59D" />
      </SprayShoot>

      {/* 2. Foam Stream & Cloud */}
      <SprayShoot tx={0} ty={0} delay={0}>
        <G transform="scale(0.8)">
          {/* Puffy Cloud */}
          <Path d="M -20 -40 C -40 -50, -30 -80, -5 -85 C 5 -105, 30 -100, 35 -80 C 55 -70, 45 -45, 25 -35 C 15 -30, -5 -30, -20 -40 Z" fill="#E6EE9C" />
          {/* Stream to bottle */}
          <Path d="M -5 -7 L 5 -7 L 15 -40 L -15 -40 Z" fill="#E6EE9C" />

          {/* Foam Bubbles */}
          <Circle cx={5} cy={-60} r={6} fill="#FFF" />
          <Circle cx={-12} cy={-70} r={4} fill="#FFF" />
          <Circle cx={22} cy={-75} r={5} fill="#FFF" />
          <Circle cx={15} cy={-45} r={3} fill="#FFF" />
          <Circle cx={-5} cy={-40} r={4} fill="#FFF" />
        </G>
      </SprayShoot>

      {/* 3. Splashing Foam Particles */}
      <SprayShoot tx={-15} ty={-40} delay={50}><Circle cx={0} cy={0} r={3} fill="#E6EE9C" /></SprayShoot>
      <SprayShoot tx={25} ty={-50} delay={80}><Circle cx={0} cy={0} r={4} fill="#FFF" /></SprayShoot>
      <SprayShoot tx={-25} ty={-20} delay={120}><Circle cx={0} cy={0} r={2.5} fill="#FFF" /></SprayShoot>
      <SprayShoot tx={15} ty={-70} delay={100}><Circle cx={0} cy={0} r={3} fill="#E6EE9C" /></SprayShoot>

      {/* 4. Bottle Shape */}
      {/* Body & Neck */}
      <Path d="M -7 0 L 7 0 L 7 10 C 7 20, 18 25, 18 35 L 18 70 L -18 70 L -18 35 C -18 25, -7 20, -7 10 Z" fill="#2E7D32" />

      {/* Curved White Highlight on Left */}
      <Path d="M -14 36 L -14 62 A 2 2 0 0 0 -11 62 L -11 36 A 2 2 0 0 0 -14 36 Z" fill="#81C784" />
      <Path d="M -12 28 C -9 23, -5 18, -5 13 L -2 13 C -2 18, -6 23, -9 28 Z" fill="#81C784" />

      {/* Yellow Label */}
      <Polygon points="-18,44 18,44 18,60 -18,60" fill="#FBC02D" />
      <Polygon points="-18,48 18,48 18,56 -18,56" fill="#F57F17" />
      {/* Round Gold Seal on Neck Base */}
      <Ellipse cx={0} cy={30} rx={8} ry={6} fill="#FBC02D" />
      <Ellipse cx={0} cy={30} rx={5} ry={3.5} fill="#FFF" />

      {/* Gold Foil */}
      <Path d="M -7 0 L 7 0 L 7 10 C 7 14, 11 17, 12 18 L -12 18 C -11 17, -7 14, -7 10 Z" fill="#FBC02D" />

      {/* Green Lip at Top */}
      <Polygon points="-8,-5 8,-5 8,0 -8,0" fill="#1B5E20" />
      <Polygon points="-7,-7 7,-7 7,-5 -7,-5" fill="#388E3C" />

      {/* 5. The Cork */}
      <CorkPop>
        <G transform="rotate(20)">
          {/* Cork Stem */}
          <Path d="M -5 -8 L 5 -8 L 4 0 L -4 0 Z" fill="#A06A42" />
          {/* Cork Cap */}
          <Path d="M -7 -8 C -7 -16, 7 -16, 7 -8 Z" fill="#D4A373" />
          {/* Cap Top Highlight */}
          <Ellipse cx={0} cy={-12} rx={3} ry={1.5} fill="#E6C280" />
        </G>
      </CorkPop>

    </G>
  </FaceShell>
);

export default React.memo(CelebrateFace);
