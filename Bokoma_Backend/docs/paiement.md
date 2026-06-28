┌─────────────────────────────────────────────────────────────┐
│                    payment.service.js                        │
│                  (SEUL service CinetPay)                     │
│                                                              │
│  • initializePayment()  →  POST /v1/payment                  │
│  • verifyPayment()      →  GET  /v1/payment/:id              │
│  • authenticate()       →  POST /v1/oauth/login              │
│                                                              │
│  API: https://api.cinetpay.net (v1 OAuth Bearer)             │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        │                   │                   │
┌───────┴────────┐  ┌──────┴───────┐  ┌────────┴────────┐
│ order.controller│  │ paymentVerify│  │ paymentExpiry   │
│ (createOrder)  │  │ .job.js      │  │ .job.js         │
└────────────────┘  └──────────────┘  └─────────────────┘

Checklist finale
Supprimer src/services/cinetpay.service.js
Remplacer src/services/payment.service.js (version ci-dessus)
Remplacer src/jobs/paymentVerification.job.js
Remplacer src/jobs/paymentExpiry.job.js
Vérifier .env : CINETPAY_API_URL=https://api.cinetpay.net

Pourquoi unifier les jobs sur payment.service.js
La logique est simple :

Création du paiement  →  payment.service.js (API v1)  →  Transaction créée sur API v1
                                                                  ↓
Vérification du paiement  →  DOIT utiliser la MÊME API (v1)

Si tu vérifies avec une API différente, la transaction n'existe pas dedans → 404 à chaque fois → commande annulée à tort.
Les deux APIs CinetPay coexistent mais sont incompatibles :

API
URL
Auth
Utilisée par
v1
api.cinetpay.net
OAuth Bearer
✅ Création + webhook
v2
api-checkout.cinetpay.com
apikey/password
❌ Jobs (incompatible)