# Préparer un entretien — SLOT

[Regarder l’explication en français](../public/demo/walkthrough-fr.mp4) · [Lire son texte](../public/demo/walkthrough-fr.txt). Démonstration montée à partir d’interactions réelles, avec voix de synthèse française et sous-titres.

## Présentation d’environ trois minutes

SLOT est une application de réservation pour un coach sportif indépendant. Le problème paraît simple : montrer un calendrier et laisser un client choisir une séance. Mais une réservation doit rester correcte lorsque plusieurs personnes agissent au même moment, lorsqu’un paiement arrive en retard ou lorsqu’un horaire change.

Dans la démonstration, un client choisit une séance individuelle ou collective. Le serveur lui réserve une place pendant dix minutes. Il peut ensuite confirmer un paiement simulé, déplacer sa réservation ou l’annuler. Le coach possède un autre espace pour modifier ses prestations, publier des séances, organiser ses pauses et consulter les réservations. Les personnes et le studio sont fictifs, mais les opérations passent réellement par le serveur et la base de données.

J’ai choisi Next.js et TypeScript pour garder l’interface et le serveur dans un projet que je peux comprendre seul. Les pages publiques sont simples ; les composants interactifs gèrent le calendrier et les formulaires. Les règles de réservation sont dans des services séparés. Les formulaires sont vérifiés côté serveur et les permissions sont contrôlées à partir de la session, pas seulement en cachant des boutons.

La difficulté principale est la concurrence. Deux clients peuvent voir la dernière place disponible. Il ne suffit donc pas de vérifier le nombre de places dans le navigateur. Le serveur ouvre une transaction et verrouille le studio avant de vérifier la disponibilité et d’écrire la réservation. Des règles dans PostgreSQL servent également de garde-fou. La démonstration de la dernière place appelle ce vrai mécanisme deux fois. Une demande réussit et l’autre reçoit une erreur compréhensible.

J’ai aussi séparé l’état de la réservation de celui du paiement. Un paiement reçu après expiration ne peut pas recréer une place : il est signalé pour remboursement. Les événements de paiement en double sont traités de façon idempotente, c’est-à-dire sans confirmer deux fois la même opération.

Le projet a été développé avec assistance IA. Mon objectif est de savoir expliquer les règles, lire leurs tests et modifier une fonctionnalité moi-même. Aujourd’hui, la démonstration locale utilise PGlite ; la validation de concurrence entre connexions distinctes utilise PostgreSQL natif dans la CI. Les paiements réels et l’inscription autonome restent hors périmètre. Avec plus de temps, j’ajouterais la récupération de compte, la synchronisation de calendrier et une meilleure supervision des intégrations.

La durée dépend de ton débit : répète avec un chronomètre et réserve quelques secondes à la démonstration. Ne récite pas une partie que tu ne sais pas encore expliquer.

## Questions et réponses

### Pourquoi Next.js ?

Pour réunir pages, rendu serveur et API sans maintenir deux déploiements. Un backend séparé ne résoudrait pas encore de problème concret ici.

### Pourquoi PostgreSQL et du SQL direct ?

Les transactions, relations et contraintes conviennent aux réservations. Le SQL direct rend le verrouillage et les triggers visibles ; il demande en échange des migrations et tests rigoureux.

### Comment évites-tu deux réservations ?

Le service verrouille une ligne du studio, relit la capacité puis écrit dans la même transaction. Le trigger de capacité est un garde-fou supplémentaire. Il faut montrer le test concurrent, pas seulement le bouton de la démo.

### Que contient le cookie ?

Un jeton aléatoire opaque. La base conserve son empreinte et sa date d’expiration. Chaque requête retrouve le rôle réel côté serveur.

### Pourquoi séparer paiement et réservation ?

Annuler une séance et rembourser sont deux opérations différentes. Un paiement tardif doit être conservé pour traitement sans voler la place d’un autre client.

### Et les fuseaux horaires ?

La base conserve des instants. Le studio utilise un fuseau IANA explicite. Une heure locale inexistante ou ambiguë est refusée plutôt que devinée.

### Comment passer à l’échelle ?

Mesurer d’abord les attentes sur les verrous et le nombre de connexions. Ensuite affiner les verrous, partager la limitation de débit, superviser les jobs et éventuellement ajouter des événements temps réel.

### Qu’as-tu réellement vérifié ?

Consulter docs/VERIFICATION.md. Les tests locaux de règles ne remplacent pas un test PostgreSQL natif ou un essai réel du fournisseur de paiement.

## Exercice pratique

Objectif : modifier la durée de blocage d’une place, sans laisser une valeur incohérente.

1. Dans `src/server/bookings.ts`, trouve la création de HOLD et la durée de dix minutes.
2. Transforme cette durée en une constante métier documentée ; retrouve aussi les textes qui l’annoncent et les contrôles liés à l’expiration.
3. Choisis cinq minutes pour l’exercice. Ne change pas arbitrairement les règles de Stripe.
4. Ajoute un test qui expire une réservation, puis vérifie qu’un autre client récupère la place et que l’ancien client ne peut plus confirmer.
5. Lance les vérifications et explique pourquoi modifier seulement le texte du bouton serait insuffisant.

## Méthode d’apprentissage

Pour chaque fonction, explique son entrée, sa sortie, les erreurs possibles et le test qui les couvre. Montre les limites avec assurance. Dis « développé avec assistance IA, puis vérifié et étudié » plutôt que de t’attribuer une autonomie que tu n’as pas encore acquise.
