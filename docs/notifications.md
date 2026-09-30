# Notifications

Les notifications annoncent des articles officiels de presidence.sn, rien d'autre. Leur texte vient toujours de l'article : son titre, ses premiers mots et la mention « Source : presidence.sn ». Rien n'est rédigé à la main.

## Qui les reçoit

- Seules les personnes qui ont **accepté les notifications** dans l'app.
- Par défaut, elles reçoivent **tous les nouveaux articles**. Dans les Réglages, chacun peut ne garder que certaines rubriques.
- **Heures calmes** : pendant les heures choisies par la personne (par exemple 22 h – 7 h), rien n'est envoyé. L'article l'attend dans l'app.
- Chacun reçoit l'article **dans sa langue** (français ou wolof). Si l'article n'est pas publié dans sa langue, il le reçoit en français.

## Envoi automatique (décision du 30/09/2026)

Chaque nouvel article est annoncé tout seul, **dans les 30 secondes** qui suivent son arrivée dans l'app :
- avec la **photo de l'article**. L'API attend qu'elle soit prête, 3 minutes au plus, puis envoie sans photo ;
- **une seule fois par article**, même si plusieurs serveurs le voient en même temps.

Ne sont jamais annoncés :
- un article publié par la source avant la veille ;
- un article collecté il y a plus de 30 minutes (par exemple pendant une pause) ;
- la correction d'un article déjà paru ;
- un article en quarantaine ou retiré par la source.

**Garde-fous**, dans la console, écran « Notifications » :
- **Pause** : tout éditeur peut arrêter l'envoi automatique d'un clic. Seul un administrateur peut le reprendre. Les deux gestes sont inscrits au journal d'audit.
- **Plafond** : 10 annonces automatiques par heure au plus (réglage `AUTO_NOTIFICATIONS_PER_HOUR`). Au-delà, les articles suivants ne sont pas annoncés : ils sont dans l'app.
- Chaque envoi apparaît dans l'historique de la console (« Envoi automatique le … ») et dans le journal d'audit.

## Envoi exceptionnel (deux personnes)

Pour annoncer de nouveau un article, une personne prépare la notification dans la console, et une autre la vérifie et l'envoie. Le message est le même : titre, premiers mots, photo.

## Photo sur les téléphones

- **Android** affiche la photo directement.
- **iPhone** : la photo demande un petit module dans l'app (« Notification Service Extension »). Il sera ajouté avec la version de test sur iPhone (compte Apple Developer). D'ici là, l'iPhone affiche le titre et le texte, sans photo.
