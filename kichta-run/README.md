# Kichta Run

Un jeu de course en 3D : tu cours derrière Kichta, la chatte tigrée, dans une ruelle de nuit. Saute par-dessus les obstacles, attrape les croquettes pour charger ton arme, détruis les murs, puis affronte Pucci, la chatte noire et blanche, en boss final.

Les deux chats sont modélisés d'après les photos des vrais Kichta et Pucci.

## Jouer

https://massiyousfi23-source.github.io/Snake-Massi/kichta-run/

| Action | Clavier | Téléphone |
| --- | --- | --- |
| Sauter | Espace ou ↑ | Toucher le jeu, ou le bouton SAUTER |
| Tirer | F | Bouton TIR (quand l'arme est chargée) |
| Pause | P | Bouton PAUSE |
| Plein écran | X | Bouton ⛶ |

- 3 croquettes = 1 missile.
- Après 4 croquettes d'affilée, un mur arrive : il faut le détruire avec un missile.
- Au score 260, Pucci apparaît. Il faut 3 missiles pour la vaincre. Chaque objet qu'elle lance et que tu évites rapporte une croquette.

## Technique

- `game.js` : règles, commandes et sons.
- `run3d.js` : rendu 3D (ruelle, obstacles, boss, caméra) avec Three.js, partagé avec le Snake dans `../vendor/`.
- `cats.js` : modèles 3D de Kichta et Pucci.
- `sw.js` : cache hors connexion (la vidéo de fin passe par le réseau pour être lue sur iPhone).

Pour tester, ajouter `?debug` à l'adresse : l'état du jeu est accessible dans la console via `window.kichtaRun`.
