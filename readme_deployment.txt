# Fodbold Ekspert - Professionel Kampanalyse Platform

## 🚀 Deployment til Vercel

### Forudsætninger
- GitHub konto
- Vercel konto (gratis)
- API-Football nøgle: `aa07747c8694eb00961e45919663fbc0`

### 📁 Fil Struktur
```
fodbold-ekspert/
├── index.html          # Frontend
├── api/
│   ├── matches.js       # Hent kampe
│   └── teams.js         # Hent hold statistikker
├── package.json         # Dependencies
├── vercel.json         # Vercel konfiguration
└── README.md           # Denne fil
```

### 🔧 Setup Instruktioner

#### 1. Opret GitHub Repository
```bash
# I terminal/command prompt:
mkdir fodbold-ekspert
cd fodbold-ekspert
git init
```

#### 2. Tilføj alle filer
- Kopier `index.html` (din frontend)
- Opret `api/` mappe og tilføj `matches.js` og `teams.js`
- Tilføj `package.json` og `vercel.json`

#### 3. Push til GitHub
```bash
git add .
git commit -m "Initial commit - Fodbold Ekspert Platform"
git branch -M main
git remote add origin https://github.com/DIT_BRUGERNAVN/fodbold-ekspert.git
git push -u origin main
```

#### 4. Deploy til Vercel

1. **Gå til [vercel.com](https://vercel.com)**
2. **Log ind med GitHub**
3. **Klik "New Project"**
4. **Import dit `fodbold-ekspert` repository**
5. **Tilføj Environment Variable:**
   - Name: `API_FOOTBALL_KEY`
   - Value: `aa07747c8694eb00961e45919663fbc0`
6. **Klik "Deploy"**

### 🌐 Efter Deployment

Dit website vil være tilgængeligt på:
```
https://fodbold-ekspert.vercel.app
```

### 📊 Features

- ✅ **Rigtige API data** fra API-Football
- ✅ **Premier League** fixtures og statistikker
- ✅ **Superligaen** kampe
- ✅ **Professionelle analyser** 3 dage før kampe
- ✅ **Team statistikker** (mål, form, boldholdelse)
- ✅ **Responsivt design** (mobil + desktop)

### 🔧 API Endpoints

Dine Vercel serverless functions:

- `GET /api/matches?league=premier&days=30` - Premier League kampe
- `GET /api/matches?league=superliga&days=30` - Superligaen kampe  
- `GET /api/teams?league=premier&teamId=50` - Team statistikker

### 🔄 Automatisk Updates

- **GitHub push** → Automatisk re-deploy på Vercel
- **API data** cache i 10 minutter (kampe) / 1 time (hold)
- **Rate limiting** built-in for at beskytte API quota

### 📈 Monitoring

I Vercel dashboard kan du se:
- **Traffic statistikker**
- **API call usage**
- **Error logs**
- **Performance metrics**

### 🚨 Troubleshooting

**Problem:** API calls fejler
- **Løsning:** Check Environment Variables i Vercel dashboard

**Problem:** CORS errors
- **Løsning:** Headers er sat korrekt i `vercel.json`

**Problem:** Rate limiting
- **Løsning:** API cache reducerer calls betydeligt

### 💡 Næste Skridt

1. **Tilføj domæne** i Vercel settings
2. **Google Analytics** for traffic tracking
3. **Email notifications** ved nye analyser
4. **Database integration** for historiske prognoser

---

**🎯 Din platform er nu live med rigtige API data!**