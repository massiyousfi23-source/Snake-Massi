# Snake Massi

Un jeu Snake en 3D, tactile et installable, conçu pour téléphone et ordinateur. La caméra suit le serpent de dos.

## Jouer

**[Ouvrir Snake Massi](https://massiyousfi23-source.github.io/Snake-Massi/)** · **[Kichta Run](https://massiyousfi23-source.github.io/Snake-Massi/kichta-run/)**

## Commandes

On tourne à gauche ou à droite par rapport au serpent :

- Téléphone : toucher la moitié gauche ou droite du jeu, glisser le doigt, ou les boutons GAUCHE / DROITE.
- Ordinateur : flèches ← → ou touches `Q` / `D` (`A` / `D` en QWERTY).
- Pause : bouton **Pause** ou touche `P` / espace.

La mini-carte en haut à droite montre la pomme, orientée dans le sens du serpent.

## Niveaux

- **Classique** : le jeu de départ, plateau vert.
- **Kichta** au score 10 : serpent noir et blanc rayé et vitesse accrue.
- **Pucci** au score 20 : couleurs néon et commandes gauche / droite inversées.
- **Amour** au score 30 : victoire KICHTA ♥ PUCCI.

Le record est conservé sur l’appareil. Après la première visite, le jeu peut aussi fonctionner hors ligne.
Pour tester, ajouter `?debug` à l’adresse : l’état du jeu est accessible dans la console via `window.snakeMassi`.

## Technique

Le projet utilise HTML, CSS et JavaScript, avec Three.js (embarqué dans `vendor/`) pour la 3D. Il n’a besoin d’aucune dépendance à installer, clé API ni étape de compilation. GitHub Pages sert directement les fichiers de la branche principale.

Vérification rapide :

```bash
npm run check
```
