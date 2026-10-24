/* Academic Summit - zuma-art.js: the four clay poses as vectors.
   Transcribed from the mascot studio page - do not edit by hand. */
window.ZUMA_SVG = {
welcome: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <filter id="clayGrain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.12 0" in="noise" result="alphaNoise"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <radialGradient id="clayBodyGrad" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#b0a8a0"/>
      <stop offset="45%" stop-color="#7c746e"/>
      <stop offset="85%" stop-color="#544c46"/>
      <stop offset="100%" stop-color="#3d3631"/>
    </radialGradient>
    <linearGradient id="warmLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffebd6" stop-opacity="0.45"/>
      <stop offset="40%" stop-color="#ffebd6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="eyeShine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#d0d0d0"/>
    </linearGradient>
  </defs>
  <g id="mascot-welcome">
    <path d="M 140 185 C 90 200, 45 220, 50 245 C 55 265, 80 260, 105 240 C 125 225, 145 210, 160 205 Z" fill="url(#clayBodyGrad)"/>
    <path d="M 140 185 C 90 200, 45 220, 50 245 C 55 265, 80 260, 105 240 C 125 225, 145 210, 160 205 Z" fill="url(#warmLight)"/>
    <circle cx="50" cy="245" r="16" fill="url(#clayBodyGrad)"/>
    <circle cx="50" cy="245" r="16" fill="url(#warmLight)"/>
    <path d="M 260 185 C 310 200, 355 220, 350 245 C 345 265, 320 260, 295 240 C 275 225, 255 210, 240 205 Z" fill="url(#clayBodyGrad)"/>
    <path d="M 260 185 C 310 200, 355 220, 350 245 C 345 265, 320 260, 295 240 C 275 225, 255 210, 240 205 Z" fill="url(#warmLight)"/>
    <circle cx="350" cy="245" r="16" fill="url(#clayBodyGrad)"/>
    <circle cx="350" cy="245" r="16" fill="url(#warmLight)"/>
    <path d="M 145 290 Q 130 350 115 355 C 100 360, 145 375, 170 365 Q 170 320 175 295 Z" fill="url(#clayBodyGrad)"/>
    <path d="M 145 290 Q 130 350 115 355 C 100 360, 145 375, 170 365 Q 170 320 175 295 Z" fill="url(#warmLight)"/>
    <ellipse cx="140" cy="360" rx="28" ry="14" fill="url(#clayBodyGrad)"/>
    <ellipse cx="140" cy="360" rx="28" ry="14" fill="url(#warmLight)"/>
    <path d="M 255 290 Q 270 350 285 355 C 300 360, 255 375, 230 365 Q 230 320 225 295 Z" fill="url(#clayBodyGrad)"/>
    <path d="M 255 290 Q 270 350 285 355 C 300 360, 255 375, 230 365 Q 230 320 225 295 Z" fill="url(#warmLight)"/>
    <ellipse cx="260" cy="360" rx="28" ry="14" fill="url(#clayBodyGrad)"/>
    <ellipse cx="260" cy="360" rx="28" ry="14" fill="url(#warmLight)"/>
    <path d="M 200 50 C 265 50, 275 120, 270 200 C 265 285, 245 330, 200 330 C 155 330, 135 285, 130 200 C 125 120, 135 50, 200 50 Z" fill="url(#clayBodyGrad)"/>
    <path d="M 200 50 C 265 50, 275 120, 270 200 C 265 285, 245 330, 200 330 C 155 330, 135 285, 130 200 C 125 120, 135 50, 200 50 Z" fill="url(#warmLight)"/>
    <path d="M 200 50 C 265 50, 275 120, 270 200 C 265 285, 245 330, 200 330 C 155 330, 135 285, 130 200 C 125 120, 135 50, 200 50 Z" fill="#7c746e" filter="url(#clayGrain)" opacity="0.4"/>
    <ellipse cx="168" cy="155" rx="20" ry="25" fill="#ffffff"/>
    <ellipse cx="171" cy="157" rx="16" ry="21" fill="#1e130c"/>
    <circle cx="164" cy="146" r="7" fill="url(#eyeShine)"/>
    <circle cx="176" cy="167" r="3" fill="url(#eyeShine)"/>
    <ellipse cx="232" cy="155" rx="20" ry="25" fill="#ffffff"/>
    <ellipse cx="229" cy="157" rx="16" ry="21" fill="#1e130c"/>
    <circle cx="222" cy="146" r="7" fill="url(#eyeShine)"/>
    <circle cx="234" cy="167" r="3" fill="url(#eyeShine)"/>
    <circle cx="200" cy="172" r="4.5" fill="#423b36"/>
    <circle cx="199" cy="171" r="1.5" fill="#9e948d"/>
    <path d="M 165 190 Q 200 220 235 190" fill="none" stroke="#231b15" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`,
notice: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <filter id="clayGrain2" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.12 0" in="noise" result="alphaNoise"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <radialGradient id="clayBodyGrad2" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#b0a8a0"/>
      <stop offset="45%" stop-color="#7c746e"/>
      <stop offset="85%" stop-color="#544c46"/>
      <stop offset="100%" stop-color="#3d3631"/>
    </radialGradient>
    <linearGradient id="warmLight2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffebd6" stop-opacity="0.45"/>
      <stop offset="40%" stop-color="#ffebd6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="eyeShine2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#d0d0d0"/>
    </linearGradient>
  </defs>
  <g id="mascot-notice">
    <path d="M 140 190 Q 105 230 110 270 C 112 285 130 285 138 270 Q 150 230 160 205 Z" fill="url(#clayBodyGrad2)"/>
    <path d="M 140 190 Q 105 230 110 270 C 112 285 130 285 138 270 Q 150 230 160 205 Z" fill="url(#warmLight2)"/>
    <path d="M 255 195 Q 285 160 300 110 C 310 110 325 125 315 140 Q 290 180 245 210 Z" fill="url(#clayBodyGrad2)"/>
    <path d="M 255 195 Q 285 160 300 110 C 310 110 325 125 315 140 Q 290 180 245 210 Z" fill="url(#warmLight2)"/>
    <rect x="295" y="80" width="16" height="35" rx="8" fill="url(#clayBodyGrad2)"/>
    <rect x="295" y="80" width="16" height="35" rx="8" fill="url(#warmLight2)"/>
    <circle cx="308" cy="112" r="13" fill="url(#clayBodyGrad2)"/>
    <circle cx="308" cy="112" r="13" fill="url(#warmLight2)"/>
    <ellipse cx="150" cy="355" rx="28" ry="14" fill="url(#clayBodyGrad2)"/>
    <ellipse cx="150" cy="355" rx="28" ry="14" fill="url(#warmLight2)"/>
    <ellipse cx="250" cy="355" rx="28" ry="14" fill="url(#clayBodyGrad2)"/>
    <ellipse cx="250" cy="355" rx="28" ry="14" fill="url(#warmLight2)"/>
    <path d="M 145 280 L 135 355 L 175 355 L 175 285 Z" fill="url(#clayBodyGrad2)"/>
    <path d="M 145 280 L 135 355 L 175 355 L 175 285 Z" fill="url(#warmLight2)"/>
    <path d="M 255 280 L 265 355 L 225 355 L 225 285 Z" fill="url(#clayBodyGrad2)"/>
    <path d="M 255 280 L 265 355 L 225 355 L 225 285 Z" fill="url(#warmLight2)"/>
    <path d="M 200 50 C 265 50, 275 120, 270 200 C 265 285, 245 330, 200 330 C 155 330, 135 285, 130 200 C 125 120, 135 50, 200 50 Z" fill="url(#clayBodyGrad2)"/>
    <path d="M 200 50 C 265 50, 275 120, 270 200 C 265 285, 245 330, 200 330 C 155 330, 135 285, 130 200 C 125 120, 135 50, 200 50 Z" fill="url(#warmLight2)"/>
    <path d="M 200 50 C 265 50, 275 120, 270 200 C 265 285, 245 330, 200 330 C 155 330, 135 285, 130 200 C 125 120, 135 50, 200 50 Z" fill="#7c746e" filter="url(#clayGrain2)" opacity="0.4"/>
    <ellipse cx="170" cy="150" rx="21" ry="26" fill="#ffffff"/>
    <ellipse cx="175" cy="150" rx="16" ry="21" fill="#1e130c"/>
    <circle cx="168" cy="139" r="7.5" fill="url(#eyeShine2)"/>
    <circle cx="180" cy="160" r="3" fill="url(#eyeShine2)"/>
    <ellipse cx="235" cy="148" rx="21" ry="26" fill="#ffffff"/>
    <ellipse cx="238" cy="148" rx="16" ry="21" fill="#1e130c"/>
    <circle cx="231" cy="137" r="7.5" fill="url(#eyeShine2)"/>
    <circle cx="243" cy="158" r="3" fill="url(#eyeShine2)"/>
    <circle cx="204" cy="168" r="4.5" fill="#423b36"/>
    <circle cx="203" cy="167" r="1.5" fill="#9e948d"/>
    <path d="M 180 185 Q 205 212 230 185 Q 205 195 180 185 Z" fill="#231b15"/>
    <path d="M 155 118 Q 172 110 188 118" fill="none" stroke="#423b36" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M 220 114 Q 237 106 253 114" fill="none" stroke="#423b36" stroke-width="3.5" stroke-linecap="round"/>
  </g>
</svg>`,
studying: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <filter id="clayGrain3" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.12 0" in="noise" result="alphaNoise"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <radialGradient id="clayBodyGrad3" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#b0a8a0"/>
      <stop offset="45%" stop-color="#7c746e"/>
      <stop offset="85%" stop-color="#544c46"/>
      <stop offset="100%" stop-color="#3d3631"/>
    </radialGradient>
    <linearGradient id="warmLight3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffebd6" stop-opacity="0.45"/>
      <stop offset="40%" stop-color="#ffebd6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="eyeShine3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#d0d0d0"/>
    </linearGradient>
    <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e4d3b"/>
      <stop offset="100%" stop-color="#0d281e"/>
    </linearGradient>
  </defs>
  <g id="mascot-studying">
    <path d="M 110 320 C 110 280, 160 270, 200 280 C 240 270, 290 280, 290 320 C 290 355, 230 365, 200 365 C 170 365, 110 355, 110 320 Z" fill="url(#clayBodyGrad3)"/>
    <path d="M 110 320 C 110 280, 160 270, 200 280 C 240 270, 290 280, 290 320 C 290 355, 230 365, 200 365 C 170 365, 110 355, 110 320 Z" fill="url(#warmLight3)"/>
    <path d="M 200 70 C 260 70, 270 135, 265 210 C 260 270, 245 315, 200 315 C 155 315, 140 270, 135 210 C 130 135, 140 70, 200 70 Z" fill="url(#clayBodyGrad3)"/>
    <path d="M 200 70 C 260 70, 270 135, 265 210 C 260 270, 245 315, 200 315 C 155 315, 140 270, 135 210 C 130 135, 140 70, 200 70 Z" fill="url(#warmLight3)"/>
    <path d="M 200 70 C 260 70, 270 135, 265 210 C 260 270, 245 315, 200 315 C 155 315, 140 270, 135 210 C 130 135, 140 70, 200 70 Z" fill="#7c746e" filter="url(#clayGrain3)" opacity="0.4"/>
    <polygon points="120,240 200,260 280,240 280,295 200,315 120,295" fill="url(#bookCover)"/>
    <polygon points="126,242 198,258 198,308 126,292" fill="#f4efe6"/>
    <polygon points="202,258 274,242 274,292 202,308" fill="#eae2d2"/>
    <line x1="200" y1="258" x2="200" y2="312" stroke="#0d281e" stroke-width="3"/>
    <line x1="138" y1="256" x2="186" y2="266" stroke="#c0b8ac" stroke-width="2"/>
    <line x1="138" y1="266" x2="186" y2="276" stroke="#c0b8ac" stroke-width="2"/>
    <line x1="138" y1="276" x2="176" y2="284" stroke="#c0b8ac" stroke-width="2"/>
    <line x1="214" y1="266" x2="262" y2="256" stroke="#c0b8ac" stroke-width="2"/>
    <line x1="214" y1="276" x2="262" y2="266" stroke="#c0b8ac" stroke-width="2"/>
    <circle cx="126" cy="272" r="14" fill="url(#clayBodyGrad3)"/>
    <circle cx="126" cy="272" r="14" fill="url(#warmLight3)"/>
    <circle cx="274" cy="272" r="14" fill="url(#clayBodyGrad3)"/>
    <circle cx="274" cy="272" r="14" fill="url(#warmLight3)"/>
    <ellipse cx="170" cy="170" rx="19" ry="22" fill="#ffffff"/>
    <ellipse cx="170" cy="175" rx="13" ry="15" fill="#1e130c"/>
    <circle cx="166" cy="168" r="5" fill="url(#eyeShine3)"/>
    <ellipse cx="230" cy="170" rx="19" ry="22" fill="#ffffff"/>
    <ellipse cx="230" cy="175" rx="13" ry="15" fill="#1e130c"/>
    <circle cx="226" cy="168" r="5" fill="url(#eyeShine3)"/>
    <circle cx="200" cy="186" r="4" fill="#423b36"/>
    <path d="M 175 204 Q 200 220 225 204" fill="none" stroke="#231b15" stroke-width="4.5" stroke-linecap="round"/>
  </g>
</svg>`,
cheer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <filter id="clayGrain4" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.12 0" in="noise" result="alphaNoise"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
    <radialGradient id="clayBodyGrad4" cx="30%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#b0a8a0"/>
      <stop offset="45%" stop-color="#7c746e"/>
      <stop offset="85%" stop-color="#544c46"/>
      <stop offset="100%" stop-color="#3d3631"/>
    </radialGradient>
    <linearGradient id="warmLight4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffebd6" stop-opacity="0.45"/>
      <stop offset="40%" stop-color="#ffebd6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="eyeShine4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#d0d0d0"/>
    </linearGradient>
  </defs>
  <g id="mascot-cheer">
    <path d="M 150 160 C 110 120, 80 80, 65 95 C 50 110, 85 140, 130 185 Z" fill="url(#clayBodyGrad4)"/>
    <path d="M 150 160 C 110 120, 80 80, 65 95 C 50 110, 85 140, 130 185 Z" fill="url(#warmLight4)"/>
    <circle cx="65" cy="92" r="17" fill="url(#clayBodyGrad4)"/>
    <circle cx="65" cy="92" r="17" fill="url(#warmLight4)"/>
    <path d="M 250 160 C 290 120, 320 80, 335 95 C 350 110, 315 140, 270 185 Z" fill="url(#clayBodyGrad4)"/>
    <path d="M 250 160 C 290 120, 320 80, 335 95 C 350 110, 315 140, 270 185 Z" fill="url(#warmLight4)"/>
    <circle cx="335" cy="92" r="17" fill="url(#clayBodyGrad4)"/>
    <circle cx="335" cy="92" r="17" fill="url(#warmLight4)"/>
    <path d="M 145 280 C 110 300, 75 305, 80 325 C 85 345, 120 330, 160 295 Z" fill="url(#clayBodyGrad4)"/>
    <path d="M 145 280 C 110 300, 75 305, 80 325 C 85 345, 120 330, 160 295 Z" fill="url(#warmLight4)"/>
    <ellipse cx="80" cy="325" rx="24" ry="15" transform="rotate(-20 80 325)" fill="url(#clayBodyGrad4)"/>
    <ellipse cx="80" cy="325" rx="24" ry="15" transform="rotate(-20 80 325)" fill="url(#warmLight4)"/>
    <path d="M 245 280 Q 260 330 255 360 C 250 375, 215 370, 220 345 Q 225 315 220 285 Z" fill="url(#clayBodyGrad4)"/>
    <path d="M 245 280 Q 260 330 255 360 C 250 375, 215 370, 220 345 Q 225 315 220 285 Z" fill="url(#warmLight4)"/>
    <ellipse cx="245" cy="365" rx="26" ry="13" fill="url(#clayBodyGrad4)"/>
    <ellipse cx="245" cy="365" rx="26" ry="13" fill="url(#warmLight4)"/>
    <path d="M 200 70 C 265 70, 275 130, 270 205 C 265 280, 245 315, 200 315 C 155 315, 135 280, 130 205 C 125 130, 135 70, 200 70 Z" fill="url(#clayBodyGrad4)"/>
    <path d="M 200 70 C 265 70, 275 130, 270 205 C 265 280, 245 315, 200 315 C 155 315, 135 280, 130 205 C 125 130, 135 70, 200 70 Z" fill="url(#warmLight4)"/>
    <path d="M 200 70 C 265 70, 275 130, 270 205 C 265 280, 245 315, 200 315 C 155 315, 135 280, 130 205 C 125 130, 135 70, 200 70 Z" fill="#7c746e" filter="url(#clayGrain4)" opacity="0.4"/>
    <ellipse cx="168" cy="155" rx="20" ry="24" fill="#ffffff"/>
    <ellipse cx="171" cy="155" rx="15" ry="19" fill="#1e130c"/>
    <circle cx="164" cy="146" r="7" fill="url(#eyeShine4)"/>
    <ellipse cx="232" cy="155" rx="20" ry="24" fill="#ffffff"/>
    <ellipse cx="229" cy="155" rx="15" ry="19" fill="#1e130c"/>
    <circle cx="222" cy="146" r="7" fill="url(#eyeShine4)"/>
    <circle cx="200" cy="168" r="4" fill="#423b36"/>
    <path d="M 165 185 Q 200 235 235 185 Z" fill="#231b15"/>
    <path d="M 180 208 Q 200 195 220 208 C 215 222 185 222 180 208 Z" fill="#e05252"/>
  </g>
</svg>`
};
