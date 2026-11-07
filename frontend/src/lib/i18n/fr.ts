export const fr = {
  common: {
    appName: "Mawjoud",
    tagline:
      "Vérifiez la disponibilité de vos médicaments dans les pharmacies de toute la Tunisie, grâce aux signalements des patients et des pharmaciens.",
    // "Appelez la pharmacie…" is split out so it can be emphasised (8.13).
    // Concatenated, the two are byte-identical to the previous single string.
    disclaimer:
      "Informations signalées par la communauté — il ne s'agit pas d'un flux de stock officiel ni garanti.",
    disclaimerAction: "Appelez la pharmacie avant de vous déplacer.",
    governorateLabel: "Gouvernorat",
    footerNote:
      "Mawjoud — projet en cours de construction. Aucune information médicale n'est fournie sur ce site.",
    backHome: "Retour à la recherche",
    contactEmail: "contact@mawjoud.tn",
    homeAriaLabel: "Mawjoud — accueil",
    skipToContent: "Aller au contenu",
    disclaimerTitle: "Données communautaires",
  },
  header: {
    navLabel: "Navigation principale",
    medications: "Médicaments",
    pharmacies: "Pharmacies",
    pharmacist: "Espace pharmacien",
    medicationsShort: "Recherche",
    pharmacistShort: "Espace pro",
  },
  home: {
    title: "Trouvez votre médicament en Tunisie",
    loading: "Chargement de la page d'accueil…",
    ctaPharmacies: "Voir les pharmacies par gouvernorat",
    eyebrow: "24 gouvernorats · signalements en temps réel",
    titleLead: "Trouvez votre",
    titleAccent: "médicament",
    titleTail: "sans faire le tour des pharmacies",
    quickLabel: "Recherches fréquentes",
    stats: {
      medications: (n: number) => `médicament${n > 1 ? "s" : ""} suivi${n > 1 ? "s" : ""}`,
      pharmacies: (n: number) => `pharmacie${n > 1 ? "s" : ""} référencée${n > 1 ? "s" : ""}`,
      community: "appuis pour signaler un stock",
      governorates: "gouvernorats couverts",
      free: "Gratuit, sans inscription",
    },
    howTitle: "Comment ça marche",
    howSubtitle: "Trois gestes, et chaque visite aide le patient suivant.",
    how: [
      {
        title: "Recherchez",
        body: "Tapez le nom commercial ou la molécule. Les fautes de frappe sont tolérées.",
      },
      {
        title: "Appelez avant de partir",
        body: "Repérez les pharmacies où il a été vu récemment et confirmez par téléphone.",
      },
      {
        title: "Signalez en deux appuis",
        body: "Trouvé ou pas ? Votre signalement anonyme guide les autres patients.",
      },
    ],
    pharmacistTitle: "Vous êtes pharmacien ?",
    pharmacistBody:
      "Mettez à jour vos disponibilités d'un appui et voyez combien de patients recherchent chaque médicament près de chez vous.",
    pharmacistCta: "Inscrire ma pharmacie",
    pharmacistLogin: "J'ai déjà un compte",
    toolsTitle: "Outils",
    dutyTitle: "Pharmacies de garde et de nuit",
    dutyBody:
      "La nuit, le week-end ou un jour férié : trouvez les pharmacies de garde déclarées et les pharmacies de nuit les plus proches.",
    observatoryCta: "Voir les tendances",
  },
  apiStatus: {
    title: "État des services",
    subtitle:
      "Page technique : elle vérifie que le site parvient à joindre le serveur Mawjoud.",
    checking: "Vérification en cours…",
    apiOk: "API connectée",
    apiError: "API injoignable",
    dbOk: "Base de données connectée",
    dbError: "Base de données injoignable",
    retry: "Réessayer",
    coldStart: "Le serveur gratuit peut mettre jusqu'à une minute à démarrer.",
  },
  nav: {
    home: "Accueil",
  },
  pharmacies: {
    title: "Pharmacies de Tunisie",
    subtitle: "Choisissez un gouvernorat pour voir ses pharmacies, celles de garde et celles ouvertes la nuit.",
    governorateTitle: (gov: string) => `Pharmacies — ${gov}`,
    governorateSubtitle: "Annuaire communautaire. Appelez avant de vous déplacer.",
    osmNote:
      "Liste issue d'OpenStreetMap et encore incomplète. Une pharmacie manque ? Écrivez-nous.",
    count: (n: number) => `${n} pharmacie${n > 1 ? "s" : ""}`,
    loading: "Chargement des pharmacies…",
    error: "Impossible de charger la liste des pharmacies pour le moment.",
    errorTitle: "Annuaire indisponible",
    retry: "Réessayer",
    empty: "Aucune pharmacie n'est enregistrée pour le moment.",
    emptyTitle: "Aucune pharmacie",
    viewToggleLabel: "Choisir l'affichage",
    viewList: "Liste",
    viewMap: "Carte",
    showOnMap: "Voir sur la carte",
    call: "Téléphone",
    callAria: (phone: string) => `Appeler le ${phone}`,
    noPhone: "Téléphone non renseigné",
    mapAriaLabel: (gov: string) => `Carte des pharmacies — ${gov}`,
    mapLoading: "Chargement de la carte…",
    osmAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  search: {
    label: "Quel médicament cherchez-vous ?",
    placeholder: "Ex. Levothyrox, lantus, لانتوس",
    hint: "Au moins 3 lettres, en français ou en arabe (ليفوتيروكس). Les fautes de frappe sont tolérées. Ou dictez avec le micro.",
    searching: "Recherche en cours…",
    error: "La recherche est momentanément indisponible. Utilisez la liste ci-dessous.",
    noResults: (q: string) => `Aucun médicament suivi ne correspond à « ${q} ».`,
    noResultsHint: "Mawjoud ne suit qu'une sélection de médicaments pour le moment.",
    noResultsCta: "Voir les médicaments suivis",
    resultCount: (n: number) => `${n} résultat${n > 1 ? "s" : ""}`,
    listboxLabel: "Suggestions de médicaments",
    clear: "Effacer la recherche",
  },
  medications: {
    trackedTitle: "Médicaments suivis",
    trackedCount: (n: number) =>
      `${n} médicament${n > 1 ? "s" : ""} suivi${n > 1 ? "s" : ""} en Tunisie`,
    trackedNote:
      "Mawjoud suit une sélection de traitements chroniques régulièrement en tension. D'autres médicaments seront ajoutés progressivement.",
    loadError: "La liste des médicaments est momentanément indisponible.",
    loadErrorTitle: "Liste indisponible",
    categories: {
      thyroid: "Thyroïde",
      insulin: "Insulines",
      psychiatric: "Psychiatrie et neurologie",
      cancer_pain: "Douleurs cancéreuses",
    },
  },
  stock: {
    status: {
      in_stock: "Disponible",
      out_of_stock: "En rupture",
      unsure: "Incertain",
      none: "Aucun signalement",
    },
    legendTitle: "Signification des états",
    legend: {
      in_stock: "Quelqu'un l'a trouvé sur place.",
      out_of_stock: "Quelqu'un ne l'a pas trouvé.",
      unsure: "Signalement incertain.",
      none: "Personne n'a encore signalé ce médicament ici.",
    },
    reportedPatient: (when: string) => `Signalé par un patient ${when}`,
    reportedPharmacist: (when: string) => `Confirmé par la pharmacie ${when}`,
    staleWarning: "Signalement ancien — appelez la pharmacie avant de vous déplacer.",
    summary: (inStock: number, total: number) =>
      `${inStock} pharmacie${inStock > 1 ? "s" : ""} sur ${total} signale${inStock > 1 ? "nt" : ""} ce médicament comme disponible.`,
    noReportsAtAll: "Aucun signalement pour ce médicament pour le moment.",
    noReportsBody: (n: number) =>
      `Les ${n} pharmacies référencées dans ce gouvernorat sont listées ci-dessous. Soyez le premier à signaler.`,
    loading: "Chargement des disponibilités…",
    error: "Impossible de charger les disponibilités pour le moment.",
    errorTitle: "Disponibilités indisponibles",
    retry: "Réessayer",
    notFoundTitle: "Médicament introuvable",
    notFoundBody:
      "Ce médicament ne fait pas partie des médicaments suivis par Mawjoud.",
    availabilityTitle: (gov: string) => `Disponibilité — ${gov}`,
    availabilityHint: "D'après les derniers signalements de chaque pharmacie.",
    summaryShort: {
      in_stock: "disponible",
      out_of_stock: "en rupture",
      unsure: "incertain",
      none: "sans signalement",
    },
    resultsTitle: "Pharmacies",
    callCta: "Appeler",
    mapAriaLabel: (medication: string) =>
      `Carte des pharmacies et de la disponibilité de ${medication}`,
    verifiedBadge: "Pharmacie inscrite",
    verifiedLegend:
      "Un pharmacien de cet établissement met à jour lui-même les disponibilités.",
  },
  report: {
    prompt: "Vous venez d'y passer ?",
    inStock: "Disponible ici",
    outOfStock: "Pas disponible ici",
    sending: "Envoi…",
    slow: "Le serveur gratuit peut mettre jusqu'à une minute à répondre.",
    thanks: (status: string) => `Merci — enregistré comme « ${status} ».`,
    correct: "Corriger",
    invite:
      "Vous sortez d'une pharmacie ? Indiquez si le médicament y était disponible : cela aide les autres patients.",
    buttonsAriaLabel: (pharmacy: string) => `Signaler la disponibilité à ${pharmacy}`,
    errors: {
      rate_limited:
        "Vous avez déjà signalé cette pharmacie récemment. Patientez quelques minutes avant un nouveau signalement.",
      not_found:
        "Cette pharmacie ou ce médicament n'est plus disponible. Rechargez la page.",
      network: "Signalement non enregistré : connexion impossible. Réessayez.",
      generic: "Le signalement n'a pas pu être enregistré. Réessayez dans un instant.",
    },
  },
  time: {
    justNow: "à l'instant",
    minutes: (n: number) => `il y a ${n} minute${n > 1 ? "s" : ""}`,
    hours: (n: number) => `il y a ${n} heure${n > 1 ? "s" : ""}`,
    days: (n: number) => `il y a ${n} jour${n > 1 ? "s" : ""}`,
    onDate: (d: string) => `le ${d}`,
  },
  footer: {
    navLabel: "Liens du site",
    about:
      "Mawjoud aide les patients de toute la Tunisie à savoir où trouver leurs traitements chroniques, grâce aux signalements de la communauté et des pharmacies.",
    home: "Rechercher un médicament",
    observatory: "Observatoire des ruptures",
    osm: "Données cartographiques © OpenStreetMap",
    pharmacies: "Pharmacies",
    status: "État des services",
    pharmacist: "Espace pharmacien",
  },
  errors: {
    title: "Une erreur est survenue",
    body: "Cette page n'a pas pu s'afficher correctement. Réessayez ; si le problème persiste, revenez dans quelques minutes.",
    retry: "Réessayer",
    backHome: "Retour à l'accueil",
    pharmacistTitle: "Une erreur est survenue",
    pharmacistBody:
      "Votre espace pharmacien n'a pas pu s'afficher. Réessayez — aucune donnée n'est perdue.",
    globalTitle: "Mawjoud est momentanément indisponible",
    globalBody: "Une erreur inattendue est survenue. Rechargez la page pour réessayer.",
    globalRetry: "Recharger la page",
  },
  governorate: {
    pickTitle: "Où cherchez-vous ?",
    pickSubtitle: "Choisissez un gouvernorat, ou laissez Mawjoud trouver le plus proche.",
    selectLabel: "Gouvernorat",
    nearMe: "Près de moi",
    locating: "Localisation…",
    nearMeHint: "Votre position reste sur votre téléphone : elle n'est jamais envoyée à Mawjoud.",
    remembered: (gov: string) => `Continuer avec ${gov}`,
    change: "Changer de gouvernorat",
    pharmacyCount: (n: number) => `${n} pharmacie${n > 1 ? "s" : ""}`,
    noPharmacies: "Aucune pharmacie référencée",
    geoErrors: {
      unsupported: "Votre navigateur ne permet pas la localisation. Choisissez un gouvernorat.",
      denied: "Localisation refusée. Choisissez un gouvernorat dans la liste.",
      unavailable: "Position introuvable pour le moment. Choisissez un gouvernorat.",
    },
  },
  national: {
    title: "Disponibilité par gouvernorat",
    subtitle: (days: number) =>
      `Dernier signalement de chaque pharmacie, sur les ${days} derniers jours. Choisissez un gouvernorat pour voir les pharmacies.`,
    inStock: (n: number) => `${n} disponible${n > 1 ? "s" : ""}`,
    outOfStock: (n: number) => `${n} en rupture`,
    noReports: "Pas encore de signalement",
    totals: (inStock: number, govs: number) =>
      `Signalé disponible dans ${inStock} pharmacie${inStock > 1 ? "s" : ""}, dans ${govs} gouvernorat${govs > 1 ? "s" : ""}.`,
    nobody: "Aucun signalement récent dans le pays pour ce médicament.",
  },
  nearby: {
    sortByDistance: "Trier par distance",
    sorted: "Triées par distance",
    distanceAway: (d: string) => `à ${d}`,
    filterDuty: "De garde / la nuit",
    filterDutyActive: "De garde / la nuit ✓",
    dutyEmpty:
      "Aucune pharmacie de garde déclarée en ce moment dans ce gouvernorat. Les gardes sont ajoutées par les pharmaciens inscrits.",
  },
  duty: {
    onDutyUntil: (time: string) => `De garde jusqu'à ${time}`,
    openAtNight: "Ouverte la nuit",
    kinds: { night: "Garde de nuit", weekend: "Garde de week-end", holiday: "Garde de jour férié" },
    legend: "Pharmacie de garde déclarée par le pharmacien, ou pharmacie de nuit.",
  },
  confidence: {
    byPharmacy: "Confirmé par la pharmacie ces dernières 24 h",
    people: (n: number) => `Confirmé par ${n} personne${n > 1 ? "s" : ""} ces dernières 24 h`,
    single: "Un seul signalement récent",
    contested: (agree: number, disagree: number) =>
      `Avis partagés : ${agree} pour, ${disagree} contre (24 h)`,
    old: "Aucune confirmation récente",
    levels: { high: "Fiabilité élevée", medium: "Fiabilité moyenne", low: "Fiabilité faible" },
  },
  share: {
    button: "Partager",
    title: (med: string, gov: string) => `${med} — ${gov}`,
    text: (med: string, gov: string, inStock: number) =>
      inStock > 0
        ? `${med} : signalé disponible dans ${inStock} pharmacie${inStock > 1 ? "s" : ""} (${gov}) sur Mawjoud. Infos communautaires — appelez avant de vous déplacer.`
        : `Qui a trouvé ${med} (${gov}) ? Signalez-le sur Mawjoud pour aider les autres patients.`,
    copy: "Copier le lien",
    copied: "Lien copié",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    dialogTitle: "Partager cette disponibilité",
    close: "Fermer",
  },
  callScript: {
    button: "Quoi demander",
    title: "Quoi demander au téléphone",
    intro: "Lisez simplement ces phrases. Elles ne remplacent pas l'avis du pharmacien.",
    french: "En français",
    derja: "En tounsi (derja)",
    arabizi: "En tounsi (lettres latines)",
    copy: "Copier",
    copied: "Copié",
    call: "Appeler",
    close: "Fermer",
    lines: (med: string, generic: string, form: string | null) => [
      `Bonjour, est-ce que vous avez ${med} (${generic}) en stock en ce moment ?`,
      form ? `C'est la présentation : ${form}.` : null,
      "Pouvez-vous m'en mettre une boîte de côté ? Je passe aujourd'hui.",
      "Jusqu'à quelle heure êtes-vous ouverts ?",
    ],
    derjaLines: (med: string) => [
      `عسلامة، عندكمش ${med} توا؟`,
      "تنجمو تخبيولي علبة؟ نتعدّى اليوم.",
      "لوقتاش حالّين اليوم؟",
    ],
    arabiziLines: (med: string) => [
      `3aslema, 3andkomch ${med} tawa ?`,
      "Tnajmou tkhabbiwli 3olba ? Net3adda lyoum.",
      "L'wa9tech 7allin lyoum ?",
    ],
  },
  voice: {
    start: "Rechercher à la voix",
    stop: "Arrêter l'écoute",
    listening: "Je vous écoute…",
    langFr: "FR",
    langAr: "عربي",
    langSwitch: "Langue de la recherche vocale",
    unsupported: "La recherche vocale n'est pas disponible sur ce navigateur.",
    denied: "Micro refusé. Autorisez le micro ou tapez le nom.",
    privacy: "La voix est transcrite par votre navigateur (et son fournisseur), pas par Mawjoud.",
  },
  observatory: {
    title: "Observatoire des ruptures",
    subtitle:
      "Tendances anonymes et agrégées des signalements, pour les patients, les journalistes et les autorités de santé.",
    eyebrow: "Données ouvertes",
    method: (days: number, weeks: number) =>
      `État actuel : dernier signalement de chaque pharmacie sur ${days} jours. Courbes : signalements hebdomadaires sur ${weeks} semaines. Ce sont des signalements communautaires, pas un relevé officiel des stocks.`,
    download: "Télécharger les données (CSV)",
    colMedication: "Médicament",
    colNow: "Situation actuelle",
    colTrend: "Part « en rupture » (12 sem.)",
    colDemand: "Recherches (12 sem.)",
    pharmaciesNow: (inS: number, out: number) => `${inS} dispo · ${out} en rupture`,
    noData: "Pas assez de données",
    shortageRate: (pct: number) => `${pct} % en rupture`,
    trendLabel: (med: string) => `Évolution hebdomadaire de la part des signalements « en rupture » pour ${med}`,
    demandLabel: (med: string) => `Évolution hebdomadaire des recherches pour ${med}`,
    mostShort: "Les plus en tension",
    updated: (d: string) => `Mis à jour ${d}`,
    error: "L'observatoire est momentanément indisponible.",
  },
  offline: {
    banner: "Vous êtes hors ligne — informations de votre dernière visite.",
    title: "Vous êtes hors ligne",
    body: "Pas de connexion pour le moment. Les pages que vous avez déjà consultées restent disponibles :",
    none: "Aucune page enregistrée pour l'instant. Consultez un médicament une fois en ligne : il restera disponible ici.",
    retry: "Réessayer",
    serverTitle: "Mawjoud est injoignable pour le moment",
    serverBody:
      "Votre connexion fonctionne, mais le site ne répond pas. Nouvel essai automatique toutes les 10 secondes. En attendant, les pages déjà consultées restent disponibles :",
    install: "Installer l'application",
  },
  pharmacistDuty: {
    title: "Vos gardes",
    subtitle:
      "Déclarez vos gardes de nuit, de week-end ou de jour férié : les patients verront « De garde » sur votre pharmacie pendant ces horaires.",
    is24h: "Votre pharmacie est indiquée comme ouverte la nuit.",
    kindLabel: "Type de garde",
    startDate: "Début — date",
    startTime: "Début — heure",
    endDate: "Fin — date",
    endTime: "Fin — heure",
    add: "Ajouter la garde",
    adding: "Ajout…",
    remove: "Supprimer",
    none: "Aucune garde à venir.",
    current: "En cours",
    range: (from: string, to: string) => `${from} → ${to}`,
    errors: {
      generic: "La garde n'a pas pu être enregistrée. Vérifiez les horaires (72 h au maximum).",
      overlap: "Cette garde chevauche une garde déjà déclarée.",
      too_many: "Trop de gardes à venir. Supprimez-en avant d'en ajouter.",
    },
    inactive: "Les gardes pourront être déclarées une fois votre compte activé.",
  },
  admin: {
    title: "Administration",
    loginTitle: "Connexion administrateur",
    loginIntro: "Réservé à l'équipe Mawjoud. Saisissez votre adresse e-mail d'administrateur.",
    signedInAs: (email: string) => `Connecté en tant que ${email}`,
    logout: "Se déconnecter",
    forbiddenTitle: "Accès réservé",
    forbiddenBody: "Ce compte n'est pas administrateur de Mawjoud.",
    loading: "Chargement des demandes…",
    error: "Impossible de charger les demandes. Réessayez.",
    retry: "Réessayer",
    tabs: { pending: "En attente", active: "Actives", rejected: "Refusées", suspended: "Suspendues", all: "Toutes" },
    empty: "Aucune demande ici.",
    newPharmacy: "Nouvelle pharmacie",
    listedPharmacy: "Pharmacie référencée",
    applicant: "Demandeur",
    submitted: (d: string) => `Envoyée le ${d}`,
    reviewed: (d: string) => `Décision le ${d}`,
    viewOnMap: "Voir l'emplacement",
    certificate: "Certificat",
    openCertificate: "Ouvrir le certificat",
    loadingCertificate: "Ouverture…",
    noCertificate: "Aucun certificat joint",
    checklistTitle: "À vérifier avant d'approuver",
    checklist: [
      "Le nom et l'adresse du certificat correspondent à la pharmacie ci-dessus.",
      "Le document est lisible, officiel et en cours de validité.",
      "En cas de doute : appelez la pharmacie à un numéro trouvé ailleurs (enseigne, annuaire), pas celui du demandeur.",
    ],
    notePlaceholder: "Motif (obligatoire pour refuser ou suspendre — visible par le pharmacien)",
    approve: "Approuver",
    reject: "Refuser",
    suspend: "Suspendre",
    reactivate: "Réactiver",
    remove: "Supprimer la demande",
    confirmApprove: (name: string) => `Approuver le compte de « ${name} » ? Ses mises à jour seront affichées comme « Confirmé par la pharmacie ».`,
    confirmRemove: "Supprimer définitivement cette demande et son certificat ?",
    noteRequired: "Indiquez un motif.",
    actionError: "L'action a échoué. Rechargez la liste et réessayez.",
    status: { pending: "En attente", active: "Active", rejected: "Refusée", suspended: "Suspendue" },
  },
  pharmacist: {
    notice:
      "Mawjoud affiche des informations signalées par la communauté. Vos mises à jour sont affichées aux patients comme « Confirmé par la pharmacie » : elles font autorité.",

    login: {
      title: "Connexion pharmacien",
      intro:
        "Saisissez l'adresse e-mail de la pharmacie. Vous recevrez un code de connexion par e-mail — aucun mot de passe n'est nécessaire.",
      emailLabel: "Adresse e-mail",
      submit: "Recevoir un code",
      sending: "Envoi…",
      noAccount: "Votre pharmacie n'a pas encore de compte ?",
      registerLink: "Inscrire votre pharmacie",
      rateLimited:
        "Trop de demandes en peu de temps. Réessayez dans quelques minutes.",
      rateLimitedWait: (s: number) =>
        `Un code vient d'être demandé pour cette adresse. Patientez ${s} seconde${s > 1 ? "s" : ""} avant d'en demander un autre — ou utilisez le code déjà reçu.`,
      rateLimitedHourly:
        "Limite d'envoi d'e-mails atteinte pour le moment. Si vous avez déjà reçu un code dans l'heure, utilisez-le ci-dessous ; sinon réessayez plus tard.",
      haveCode: "J'ai déjà reçu un code",
    },

    magicLink: {
      sentTitle: "Entrez le code reçu par e-mail",
      sentBody: (email: string) =>
        `Si un compte est associé à ${email}, un code de connexion vient de lui être envoyé. Il est valable une heure.`,
      spamHint: "Pas reçu ? Vérifiez vos courriers indésirables, puis demandez un nouveau code.",
      codeLabel: "Code de connexion",
      codeSubmit: "Se connecter",
      codeChecking: "Vérification…",
      codeInvalid: "Code incorrect ou expiré. Demandez un nouveau code.",
      resend: "Renvoyer un code",
      resent: "Un nouveau code vient d'être envoyé.",
      sendFailed:
        "Votre demande est bien enregistrée, mais l'e-mail n'a pas pu être envoyé. Utilisez « Renvoyer un code » ci-dessous.",
    },

    validation: {
      working: "Validation de votre lien de connexion…",
      failedTitle: "Lien de connexion invalide",
      failedBody:
        "Ce lien a expiré, a déjà été utilisé, ou a été ouvert sur un autre appareil que celui d'où vous l'avez demandé.",
      retry: "Demander un nouveau lien",
      reasons: {
        other_browser:
          "Le lien a été ouvert dans un autre navigateur (ou une autre fenêtre privée) que celui où vous l'avez demandé. Un lien de connexion ne fonctionne que dans le navigateur d'origine.",
        expired:
          "Le lien a expiré ou a déjà été utilisé. Certains logiciels de sécurité (antivirus, protection de messagerie) ouvrent les liens avant vous et les consomment.",
        no_code:
          "L'adresse du lien est incomplète. Vérifiez que l'URL de redirection est autorisée dans Supabase (Authentication → URL Configuration).",
        other: "La connexion n'a pas pu être finalisée.",
      },
      technical: "Détail technique :",
      useCode: "Saisissez plutôt le code de connexion reçu dans le même e-mail — il fonctionne dans n'importe quel navigateur :",
    },

    register: {
      loading: "Chargement du formulaire d'inscription…",
      title: "Inscrire votre pharmacie",
      intro:
        "Un seul compte par pharmacie, partagé par l'équipe. Joignez le certificat ou l'autorisation d'exercer de la pharmacie : l'équipe Mawjoud le vérifie avant d'activer le compte.",
      pharmacyLabel: "Votre pharmacie",
      pharmacyPlaceholder: "Sélectionnez votre pharmacie",
      governorateLabel: "Gouvernorat",
      governoratePlaceholder: "Sélectionnez le gouvernorat",
      pharmaciesLoading: "Chargement des pharmacies…",
      pharmaciesError: "Impossible de charger les pharmacies de ce gouvernorat. Réessayez.",
      fullNameLabel: "Nom et prénom du pharmacien responsable",
      emailLabel: "Adresse e-mail du compte de la pharmacie",
      emailHint:
        "Utilisez une adresse partagée par l'équipe (par ex. celle de la pharmacie) : toute personne qui y a accès pourra se connecter.",
      notListed: "Ma pharmacie n'est pas dans la liste",
      newPharmacyTitle: "Votre pharmacie",
      newPharmacyHint:
        "Elle sera ajoutée à Mawjoud une fois votre demande validée, avec ces informations.",
      newNameLabel: "Nom de la pharmacie",
      newAddressLabel: "Adresse",
      newCityLabel: "Ville / localité",
      newPhoneLabel: "Téléphone de la pharmacie (facultatif)",
      locationLabel: "Emplacement sur la carte",
      locationHint: "Touchez la carte à l'endroit exact de la pharmacie, ou utilisez votre position si vous y êtes.",
      useMyPosition: "Utiliser ma position",
      locationMissing: "Indiquez l'emplacement de la pharmacie sur la carte.",
      locationSet: (lat: string, lng: string) => `Position choisie : ${lat}, ${lng}`,
      certificateLabel: "Certificat de la pharmacie",
      certificateHint:
        "Autorisation d'ouverture / d'exercice ou tout document officiel montrant le nom, l'adresse et l'autorisation de la pharmacie. PDF, JPG, PNG ou WEBP, 5 Mo maximum.",
      certificateChosen: (name: string, size: string) => `${name} — ${size}`,
      certificateTooBig: "Le fichier dépasse 5 Mo. Réduisez-le ou prenez une photo moins lourde.",
      certificateBadType: "Format non accepté : PDF, JPG, PNG ou WEBP uniquement.",
      certificatePrivacy:
        "Le document est stocké de façon privée et n'est consulté que par l'équipe de vérification de Mawjoud.",
      phoneLabel: "Votre téléphone",
      phoneHint:
        "Numéro tunisien, par exemple 72 431 210. Il sert uniquement à vous joindre.",
      dataNote:
        "Vos coordonnées ne sont pas publiées sur le site. Elles servent uniquement à vérifier votre inscription.",
      missingPharmacy: (email: string) =>
        `Votre pharmacie n'apparaît pas dans la liste ? Écrivez-nous à ${email}.`,
      submit: "Envoyer la demande d'inscription",
      submitting: "Envoi…",
      errors: {
        email_taken:
          "Cette adresse e-mail est déjà associée à un compte. Connectez-vous plutôt.",
        pharmacy_taken:
          "Cette pharmacie a déjà un compte. Si vous y travaillez, demandez à vos collègues l'adresse e-mail du compte et connectez-vous avec.",
        pharmacy_exists:
          "Une pharmacie avec ce nom et cette adresse existe déjà. Cherchez-la dans la liste.",
        file_too_large: "Le certificat dépasse 5 Mo.",
        file_type: "Le certificat doit être un PDF, JPG, PNG ou WEBP.",
        rate_limited:
          "Trop de demandes d'inscription depuis cet appareil. Réessayez demain.",
        not_found:
          "Cette pharmacie n'est plus disponible. Rechargez la page.",
        network:
          "Connexion impossible. Vérifiez votre réseau et réessayez.",
        generic:
          "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant.",
      },
    },

    status: {
      pendingTitle: "Compte en cours de vérification",
      pendingBody:
        "Votre demande a bien été reçue. L'équipe Mawjoud vérifie le certificat de la pharmacie avant d'activer la mise à jour des disponibilités. Vous pouvez déjà consulter votre tableau de bord.",
      reason: (note: string) => `Motif : ${note}`,
      rejectedTitle: "Demande non validée",
      rejectedBody:
        "Votre demande d'inscription n'a pas été validée. Contactez-nous si vous pensez qu'il s'agit d'une erreur.",
      suspendedTitle: "Compte suspendu",
      suspendedBody:
        "Ce compte ne peut plus mettre à jour les disponibilités. Contactez-nous pour en savoir plus.",
      noAccountTitle: "Aucun compte associé",
      noAccountBody:
        "Aucun compte pharmacien n'est associé à cette adresse e-mail.",
      registerCta: "Inscrire votre pharmacie",
    },

    dashboard: {
      loading: "Chargement de votre tableau de bord…",
      signedInAs: (email: string) => `Connecté en tant que ${email}`,
      logout: "Se déconnecter",
      updatedHint:
        "Appuyez sur un état pour le mettre à jour. La modification est visible immédiatement par les patients.",
      neverReported: "Jamais renseigné",
      lastByPatientHint:
        "Dernier état signalé par un patient. Confirmez ou corrigez d'un appui.",
      viewPublicPage: "Voir la page patient",
      searchCount: (n: number) =>
        n === 0
          ? "Aucune recherche cette semaine"
          : `${n} recherche${n > 1 ? "s" : ""} cette semaine`,
      searchCountHint:
        "Nombre estimé de patients de votre gouvernorat ayant consulté la disponibilité de ce médicament sur les 7 derniers jours.",
      topSearchedTitle: "Les plus recherchés cette semaine",
      statsTitle: "Cette semaine près de chez vous",
      boardTitle: "Vos disponibilités",
      statTracked: "médicaments suivis",
      statUpToDate: "confirmés par vous",
      statSearches: "recherches sur 7 jours",
      statsScope: (gov: string) => `Recherches de patients du gouvernorat de ${gov}.`,
      saving: "Enregistrement…",
      saveError: "Mise à jour impossible. Réessayez.",
      retry: "Réessayer",
      errors: {
        session_expired: "Votre session a expiré. Reconnectez-vous.",
        not_active: "Votre compte n'est pas encore activé.",
        no_account:
          "Aucun compte pharmacien n'est associé à cette adresse e-mail.",
        network: "Connexion impossible. Vérifiez votre réseau et réessayez.",
        generic:
          "Le tableau de bord est momentanément indisponible. Réessayez dans un instant.",
      },
    },

    toggle: {
      ariaLabel: (medication: string) => `Disponibilité de ${medication}`,
    },
  },
} as const;
