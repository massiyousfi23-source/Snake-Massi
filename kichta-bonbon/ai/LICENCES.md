# Licences de l'IA « Mon chat »

- **Modèle de vision** : TinyCLIP-ViT-40M-32-Text-19M-LAION400M (Microsoft), licence MIT —
  https://github.com/microsoft/Cream/tree/main/TinyCLIP — converti en ONNX et compressé en 8 bits.
- **Moteur** : ONNX Runtime Web (Microsoft), licence MIT — https://github.com/microsoft/onnxruntime
- **text.json** : empreintes des descriptions de traits (tools/cat-prompts.js), calculées avec le même modèle.
  Le réglage a été vérifié sur des photos de test (Oxford-IIIT Pet, CC BY-SA 4.0 ; Wikimedia Commons),
  qui ne sont pas livrées avec le jeu.
- La photo du joueur est analysée sur l'appareil et n'est envoyée nulle part.
