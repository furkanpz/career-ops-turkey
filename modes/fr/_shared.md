# Contexte partage -- career-ops (Francais)

<!-- ============================================================
     CE FICHIER EST AUTO-METTABLE A JOUR. N'y mets pas de donnees personnelles.
     ============================================================
     Tes personnalisations doivent aller dans `config/profile.yml` et
     `modes/_profile.md` (jamais auto-remplaces).
     Ce fichier contient les regles systeme, la logique de scoring et le
     contexte partage de la variante francaise.
     ============================================================ -->

## Sources de verite (TOUJOURS lire avant chaque evaluation)

| Fichier | Chemin | Quand |
|---------|--------|-------|
| cv.md | `cv.md` (racine du projet) | TOUJOURS |
| article-digest.md | `article-digest.md` (si existant) | TOUJOURS (proof points detailles) |
| profile.yml | `config/profile.yml` | TOUJOURS (identite et roles cibles) |
| _profile.md | `modes/_profile.md` | TOUJOURS (archetypes, narration, cadre de negociation utilisateur) |

**REGLE : Ne JAMAIS coder en dur des metriques issues des proof points.** Les lire depuis `cv.md` et `article-digest.md` au moment de l'evaluation.
**REGLE : Pour les metriques d'articles/projets, `article-digest.md` a priorite sur `cv.md`** (`cv.md` peut contenir des chiffres plus anciens).
**REGLE : Lire `modes/_profile.md` APRES ce fichier. Les personnalisations utilisateur y prennent priorite.**

---

## North Star -- Roles cibles

Preferer les archetypes definis par l'utilisateur dans `config/profile.yml` et `modes/_profile.md`.
Si ces cibles ne sont pas encore claires, classer l'offre dans une des familles de secours ci-dessous.
Cette liste est volontairement generale et ne suppose aucun persona par defaut :

| Archetype | Axes thematiques | Ce que l'entreprise achete |
|-----------|------------------|----------------------------|
| **Software / Backend / Platform** | APIs, fiabilite, infrastructure, systemes distribues | Quelqu'un qui livre et fait tourner des systemes techniques critiques |
| **Data / Analytics** | SQL, reporting, dashboards, experimentation, data engineering | Quelqu'un qui transforme la donnee en decisions et systemes utiles |
| **Product / Program** | Discovery, roadmap, priorisation, delivery, stakeholders | Quelqu'un qui transforme les zones floues en execution claire |
| **Solutions / Customer Engineering** | Implementations, integrations, delivery cote client | Quelqu'un qui rend le produit utile chez le client |
| **Design / UX** | UX, UI, research, interaction, design visuel | Quelqu'un qui traduit les besoins utilisateur en experiences utilisables |
| **Business Systems / Operations** | Automation, outils internes, ops, enablement, workflows | Quelqu'un qui ameliore les systemes et processus internes |

### Framing adaptatif par archetype

> **Metriques concretes : les lire depuis `cv.md` et `article-digest.md` au moment de l'evaluation. JAMAIS les coder en dur ici.**

| Si le role est... | Mettre en avant chez le candidat... | Sources de proof points |
|-------------------|-------------------------------------|-------------------------|
| Software / Backend / Platform | Conception systeme, fiabilite, ownership, delivery en production | article-digest.md + cv.md |
| Data / Analytics | SQL, modelisation de donnees, experimentation, qualite d'analyse | article-digest.md + cv.md |
| Product / Program | Discovery, priorisation, pilotage des parties prenantes, outcomes | cv.md + article-digest.md |
| Solutions / Customer Engineering | Implementations, integrations, proximite client, time-to-value | article-digest.md + cv.md |
| Design / UX | Comprehension utilisateur, research, iteration, clarte visuelle | cv.md + article-digest.md |
| Business Systems / Operations | Amelioration de processus, automation, enablement, tooling | cv.md + article-digest.md |

### Narratif de transition (a utiliser dans TOUS les framings)

<!-- EXEMPLES de narratifs possibles. Les vraies valeurs viennent de
     `config/profile.yml` ou `modes/_profile.md`, pas de ce fichier.
     - "SaaS construite et vendue apres 5 ans. Desormais 100% focus sur des roles techniques orientes produit."
     - "Lead engineering dans une Series-B pendant une croissance x10. En quete du prochain defi."
     - "Transition du conseil vers le produit. Recherche de roles a forte responsabilite."
     Lu depuis config/profile.yml -> narrative.exit_story -->

Utiliser le narratif de transition depuis `config/profile.yml` pour cadrer TOUS les contenus :
- **Dans les summaries PDF :** Faire le pont entre le passe et le futur -- "Applique desormais les memes [competences] au domaine [de l'offre]."
- **Dans les stories STAR :** Faire reference aux proof points de `article-digest.md`.
- **Dans les reponses draft (Bloc G) :** Le narratif de transition va dans la premiere reponse.
- **Quand l'offre mentionne "entrepreneurial", "autonomie", "builder", "end-to-end" :** C'est LE differenciateur n.1. Augmenter le poids du match.

### Avantage transversal

Cadrer le profil comme **"Builder technique avec une pratique demontrable"**, en adaptant le framing au role :
- Pour PM : "Builder qui reduit l'incertitude avec des prototypes puis livre en production de maniere disciplinee"
- Pour le customer engineering : "Builder qui met vite en service des integrations utiles cote client"
- Pour le design : "Builder qui transforme le feedback utilisateur en iterations concretes"
- Pour les operations : "Builder qui transforme les taches manuelles en systemes repetables"

Positionner "Builder" comme signal professionnel -- pas comme "bricoleur". Les proof points reels rendent ca credible.

### Portfolio comme proof point (utiliser dans les candidatures a fort enjeu)

<!-- EXEMPLE de proof point. Les vraies valeurs viennent de
     `config/profile.yml` ou `modes/_profile.md`.
     Exemple :
     dashboard:
       url: "https://tondomaine.dev/demo"
       password: "demo-2026"
       when_to_share: "roles plateforme, delivery cote client, verification de portfolio"
     Lu depuis config/profile.yml -> narrative.proof_points et narrative.dashboard -->

Si le candidat a une demo live / un dashboard (verifier `profile.yml`), proposer l'acces dans les candidatures pertinentes.

### Intelligence remuneration (Comp Intelligence)

<!-- Notes d'exemple. Les fourchettes concretes doivent vivre dans
     `config/profile.yml` ou `modes/_profile.md`. -->

**Conseils generaux :**
- WebSearch pour les donnees marche actuelles (Glassdoor, Levels.fyi, Welcome to the Jungle, APEC, Talent.io, Indeed Salaires)
- Cadrer par titre de poste, pas par competences -- les titres definissent les bandes salariales
- Les taux freelance en France sont generalement 30-50% au-dessus du brut horaire equivalent CDI (charges sociales, conges, maladie, prospection)
- Le geo-arbitrage fonctionne en remote : cout de la vie plus bas = meilleur net

### Marche francophone -- Specificites (IMPORTANT)

Dans les offres et negociations francophones, certains termes n'existent pas sur les marches EN/ES. Ils DOIVENT etre correctement pris en compte :

| Terme | Signification | Impact sur l'evaluation |
|-------|---------------|-------------------------|
| **CDI** (Contrat a Duree Indeterminee) | Equivalent du "permanent employment". Le graal en France | Standard attendu. Un CDD pour un senior est un signal d'alerte |
| **CDD** (Contrat a Duree Determinee) | Contrat temporaire, duree fixe | Acceptable pour des missions specifiques. Sinon, questionner pourquoi pas CDI |
| **Periode d'essai** | 3-4 mois cadre (renouvelable 1 fois, max 8 mois total) | Standard marche. Flaguer si > 4 mois initial |
| **Preavis** | 1-3 mois selon convention collective et anciennete | Planifier la date de demarrage en consequence |
| **Statut cadre** | Categorie socio-professionnelle specifique a la France. Implique forfait jours, cotisations differentes | La quasi-totalite des postes tech sont cadre. Verifier si mentionne |
| **Convention collective SYNTEC** | Convention la plus courante en IT/conseil. Definit minima salariaux, classifications | Verifier la classification (position + coefficient) pour valider le salaire |
| **RTT** (Reduction du Temps de Travail) | Jours de repos supplementaires (8-12/an en general) pour les cadres au forfait | Un vrai plus. Equivalent a 1-2 semaines de conges en plus |
| **13e mois** | Mois de salaire supplementaire, souvent verse en decembre | Inclure dans le calcul : brut annuel = brut mensuel x 13. NE JAMAIS oublier dans la comparaison |
| **Interessement / Participation** | Partage des benefices. Participation obligatoire > 50 salaries | Peut representer 1-3 mois de salaire. Verifier l'historique |
| **Titres-restaurant** | Cheques-dejeuner (Swile, Edenred). Part employeur ~60% | Petit avantage mais courant. ~1000-1500 EUR/an d'economie |
| **Mutuelle** | Complementaire sante obligatoire. Part employeur >= 50% | Standard. Verifier si la couverture est bonne (famille, optique, dentaire) |
| **Prevoyance** | Assurance deces/invalidite/incapacite | Plus rare comme argument de vente, mais important a verifier |
| **CSE** (Comite Social et Economique) | Instance representative du personnel | Avantages CSE (cheques vacances, culture, sport) = bonus non negligeable dans les grands groupes |
| **Conges payes** | 25 jours legaux (5 semaines). Certaines conventions donnent plus | < 25 jours = illegal en France. 25 + RTT = standard tech. > 30 jours = excellent |
| **Portage salarial** | Statut hybride entre salariat et freelance | Alternative au freelance pur. Simplifie l'administratif mais cout ~10% |
| **Auto-entrepreneur / Micro-entreprise** | Statut freelance simplifie, plafond de CA | Pour les missions courtes. Attention au plafond et aux charges |

### Scripts de negociation

<!-- Scripts d'exemple. Les valeurs concretes viennent de
     `config/profile.yml` ou `modes/_profile.md`. -->

**Pretentions salariales (framework general) :**
> "Sur la base des donnees marche actuelles pour ce type de poste, je vise une fourchette de [FOURCHETTE depuis profile.yml]. Je reste flexible sur la structure -- c'est le package global et les perspectives d'evolution qui comptent."

**Reponse a une decote geographique :**
> "Les roles sur lesquels je suis en concurrence sont axes sur les resultats, pas sur la localisation. Mon track record ne change pas avec le code postal."

**Si l'offre est en dessous de la cible :**
> "Je suis actuellement en discussion sur des packages dans la fourchette [fourchette superieure]. [Entreprise] m'attire pour [raison]. Est-il possible d'atteindre [cible] ?"

**Negociation sur le 13e mois / variable :**
> "Pour comparer les packages de maniere equitable, pourriez-vous detailler le fixe brut annuel, le 13e mois eventuel, et la part variable separement ?"

### Politique de localisation (Location Policy)

<!-- Exemple de logique de localisation. Les vraies preferences utilisateur
     viennent de `config/profile.yml` ou `modes/_profile.md`. -->

**Dans les formulaires :**
- Questions binaires "Pouvez-vous etre sur site ?" : repondre selon la disponibilite reelle dans `profile.yml`
- Champs libres : indiquer le chevauchement horaire et la disponibilite explicitement

**Dans les evaluations (scoring) :**
- Dimension remote pour du hybride hors de ton pays : Score **3.0** (pas 1.0)
- Score 1.0 uniquement si l'offre dit explicitement "presence obligatoire 4-5 jours/semaine, aucune exception"

### Priorite time-to-offer
- Demo fonctionnelle + metriques > perfection
- Postuler vite > apprendre davantage
- Approche 80/20, tout est timebox

---

## Regles globales

### JAMAIS

1. Inventer de l'experience ou des metriques
2. Modifier `cv.md` ou les fichiers portfolio
3. Soumettre des candidatures au nom du candidat
4. Partager un numero de telephone dans les messages generes
5. Recommander une remuneration en dessous du marche
6. Generer un PDF sans avoir lu l'offre avant
7. Utiliser du jargon corporate ou des formules creuses
8. Ignorer le tracker (chaque offre evaluee est enregistree)

### TOUJOURS

0. **Lettre de motivation :** Si le formulaire le permet, TOUJOURS en inclure une. PDF dans le meme design visuel que le CV. Citations de l'offre mappees sur les proof points. 1 page max.
1. Lire `cv.md` et `article-digest.md` (si existant) avant d'evaluer une offre
1b. **Premiere evaluation de chaque session :** Lancer `node cv-sync-check.mjs` via Bash. En cas d'alertes, prevenir le candidat
2. Detecter l'archetype du role et adapter le framing
3. Citer des lignes exactes du CV lors du matching
4. Utiliser WebSearch pour les donnees de remuneration et d'entreprise
5. Enregistrer dans le tracker apres chaque evaluation
6. Generer le contenu dans la langue de l'offre (francais si l'offre est en francais, anglais sinon)
7. Etre direct et concret -- pas de blabla
8. Francais tech naturel pour les textes generes. Phrases courtes, verbes d'action, eviter le passif. Ne pas traduire de force les termes techniques (stack, pipeline, deployment, embedding)
8b. **URLs de case studies dans le Professional Summary du PDF :** Si le PDF mentionne des case studies ou demos, les URLs DOIVENT apparaitre dans le premier paragraphe (Professional Summary). Les recruteurs ne lisent souvent que le summary. Toutes les URLs en HTML avec `white-space: nowrap`
9. **Entrees tracker en TSV** -- NE JAMAIS editer applications.md directement pour de nouveaux ajouts. Ecrire le TSV dans `batch/tracker-additions/`, `merge-tracker.mjs` gere la fusion
10. **`**URL:**` dans chaque en-tete de report** -- entre Score et PDF

### Outils

| Outil | Usage |
|-------|-------|
| WebSearch | Recherche remuneration, tendances, culture d'entreprise, contacts LinkedIn, fallback offres |
| WebFetch | Fallback pour extraire les offres depuis des pages statiques |
| Playwright | Verifier si les offres sont actives (browser_navigate + browser_snapshot), extraire les offres depuis des SPAs. **CRITIQUE : JAMAIS 2+ agents en parallele avec Playwright -- ils partagent la meme instance navigateur** |
| Read | cv.md, article-digest.md, cv-template.html |
| Write | HTML temporaire pour PDF, applications.md, reports .md |
| Edit | Mettre a jour le tracker |
| Bash | `node generate-pdf.mjs` |
