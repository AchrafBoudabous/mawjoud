export const fr = {
  common: {
    appName: "Mawjoud",
    tagline:
      "Vérifiez la disponibilité de vos médicaments dans les pharmacies de Bizerte.",
    disclaimer:
      "Informations signalées par la communauté — il ne s'agit pas d'un flux de stock officiel ni garanti. Appelez la pharmacie avant de vous déplacer.",
    footerNote:
      "Mawjoud — projet en cours de construction. Aucune information médicale n'est fournie sur ce site.",
    backHome: "← Retour à la recherche",
    contactEmail: "contact@mawjoud.tn",
  },
  home: {
    ctaPharmacies: "Voir toutes les pharmacies de Bizerte",
  },
  apiStatus: {
    title: "État des services",
    checking: "Vérification en cours…",
    apiOk: "API connectée",
    apiError: "API injoignable",
    dbOk: "Base de données connectée",
    dbError: "Base de données injoignable",
    retry: "Réessayer",
    coldStart: "Le serveur gratuit peut mettre jusqu'à une minute à démarrer.",
  },
  nav: {
    home: "← Accueil",
  },
  pharmacies: {
    title: "Pharmacies de Bizerte",
    subtitle: "Annuaire des pharmacies de la région de Bizerte.",
    count: (n: number) => `${n} pharmacie${n > 1 ? "s" : ""}`,
    loading: "Chargement des pharmacies…",
    error: "Impossible de charger la liste des pharmacies pour le moment.",
    retry: "Réessayer",
    empty: "Aucune pharmacie n'est enregistrée pour le moment.",
    viewToggleLabel: "Choisir l'affichage",
    viewList: "Liste",
    viewMap: "Carte",
    showOnMap: "Voir sur la carte",
    call: "Téléphone",
    noPhone: "Téléphone non renseigné",
    mapAriaLabel: "Carte des pharmacies de Bizerte",
    mapLoading: "Chargement de la carte…",
    osmAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  search: {
    label: "Quel médicament cherchez-vous ?",
    placeholder: "Nom de marque ou molécule (ex. Levothyrox)",
    hint: "Saisissez au moins 3 lettres. Les fautes de frappe sont tolérées.",
    searching: "Recherche en cours…",
    error: "La recherche est momentanément indisponible. Utilisez la liste ci-dessous.",
    noResults: (q: string) => `Aucun médicament suivi ne correspond à « ${q} ».`,
    noResultsHint: "Mawjoud ne suit qu'une sélection de médicaments pour le moment.",
    resultCount: (n: number) => `${n} résultat${n > 1 ? "s" : ""}`,
    listboxLabel: "Suggestions de médicaments",
  },
  medications: {
    trackedTitle: "Médicaments suivis",
    trackedCount: (n: number) =>
      `${n} médicament${n > 1 ? "s" : ""} suivi${n > 1 ? "s" : ""} à Bizerte`,
    trackedNote:
      "Mawjoud suit une sélection de traitements chroniques régulièrement en tension. D'autres médicaments seront ajoutés progressivement.",
    loadError: "La liste des médicaments est momentanément indisponible.",
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
    pharmacyCount: (n: number) => `${n} pharmacie${n > 1 ? "s" : ""}`,
    noReportsAtAll: "Aucun signalement pour ce médicament pour le moment.",
    loading: "Chargement des disponibilités…",
    error: "Impossible de charger les disponibilités pour le moment.",
    retry: "Réessayer",
    notFoundTitle: "Médicament introuvable",
    notFoundBody:
      "Ce médicament ne fait pas partie des médicaments suivis par Mawjoud.",
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
    pharmacies: "Pharmacies",
    status: "État des services",
    pharmacist: "Espace pharmacien",
  },
  pharmacist: {
    notice:
      "Mawjoud affiche des informations signalées par la communauté. Vos mises à jour sont affichées aux patients comme « Confirmé par la pharmacie » : elles font autorité.",

    login: {
      title: "Connexion pharmacien",
      intro:
        "Saisissez l'adresse e-mail de votre inscription. Vous recevrez un lien de connexion — aucun mot de passe n'est nécessaire.",
      emailLabel: "Adresse e-mail",
      submit: "Recevoir un lien de connexion",
      sending: "Envoi…",
      noAccount: "Votre pharmacie n'a pas encore de compte ?",
      registerLink: "Inscrire votre pharmacie",
      rateLimited:
        "Trop de demandes en peu de temps. Réessayez dans quelques minutes.",
    },

    magicLink: {
      sentTitle: "Vérifiez votre boîte e-mail",
      sentBody: (email: string) =>
        `Si un compte pharmacien est associé à ${email}, un lien de connexion vient d'être envoyé. Il est valable une heure.`,
      sameDeviceWarning:
        "Important : ouvrez le lien sur cet appareil et dans ce navigateur. Sinon, utilisez le code à 6 chiffres ci-dessous.",
      spamHint: "Pensez à vérifier vos courriers indésirables.",
      codeLabel: "Code à 6 chiffres reçu par e-mail",
      codeSubmit: "Valider le code",
      codeChecking: "Vérification…",
      codeInvalid: "Code incorrect ou expiré. Demandez un nouveau lien.",
      resend: "Renvoyer un lien",
    },

    validation: {
      working: "Validation de votre lien de connexion…",
      failedTitle: "Lien de connexion invalide",
      failedBody:
        "Ce lien a expiré, a déjà été utilisé, ou a été ouvert sur un autre appareil que celui d'où vous l'avez demandé.",
      retry: "Demander un nouveau lien",
    },

    register: {
      title: "Inscrire votre pharmacie",
      intro:
        "L'inscription est réservée aux pharmacies de la région de Bizerte déjà référencées sur Mawjoud. Votre compte est activé après un appel de vérification au numéro de la pharmacie.",
      pharmacyLabel: "Votre pharmacie",
      pharmacyPlaceholder: "Sélectionnez votre pharmacie",
      fullNameLabel: "Nom et prénom du pharmacien",
      emailLabel: "Adresse e-mail",
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
        "Votre demande a bien été reçue. Nous appelons la pharmacie pour vérifier votre identité avant d'activer la mise à jour des disponibilités. Vous pouvez déjà consulter votre tableau de bord.",
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
        "Nombre estimé de patients ayant consulté la disponibilité de ce médicament à Bizerte sur les 7 derniers jours.",
      topSearchedTitle: "Les plus recherchés cette semaine",
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
