# 🃏 PokéVault — Guía de instalación local (Windows)

## Requisitos previos

Instala estos dos programas (solo una vez):

1. **Node.js LTS** → https://nodejs.org (botón verde "LTS")
2. **Git** (opcional) → https://git-scm.com

---

## Pasos de instalación

### 1. Abre PowerShell en la carpeta del proyecto

Coloca la carpeta `pokevault` en tu escritorio o documentos.  
Abre el Explorador de archivos, entra en la carpeta `pokevault`,  
haz clic en la barra de direcciones, escribe `powershell` y pulsa Enter.

### 2. Instala las dependencias

```powershell
npm.cmd install
```

Espera 3–5 minutos. Descargará los módulos necesarios.

### 3. Copia el archivo de configuración

```powershell
copy .env.example .env.local
```

Abre `.env.local` con el Bloc de notas (o VS Code) y asegúrate de que tiene:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="pon-aqui-cualquier-string-largo-y-secreto"
AUTH_URL="http://localhost:3000"
```

Las claves de Stripe pueden dejarse vacías — en modo demo el saldo se añade directamente.

### 4. Genera el cliente de Prisma

```powershell
npx.cmd prisma generate
```

### 5. Crea la base de datos

```powershell
npx.cmd prisma db push
```

Crea un archivo `dev.db` (SQLite) con todas las tablas.

### 6. Carga los datos de demo

```powershell
npx.cmd prisma db seed
```

Crea:
- 15 packs (Pokémon + One Piece, tiers €1–€500)
- 60+ cartas con precios reales
- 2 cuentas de demo

### 7. Arranca el servidor

```powershell
npm.cmd run dev
```

### 8. Abre en el navegador

```
http://localhost:3000
```

---

## Cuentas de demo

| Email | Contraseña | Rol | Saldo |
|-------|-----------|-----|-------|
| `demo@pokevault.local` | `demo123456` | Usuario | €1,000 |
| `admin@pokevault.local` | `admin123456` | Admin | €10,000 |

---

## Packs disponibles

| Tier | Precio | Ejemplos |
|------|--------|---------|
| Cheap | €1–€5 | Starter Pack, Electric Pack, Fire Pack |
| Medium | €10–€25 | Scarlet & Violet, Evolving Skies, One Piece Treasure, 30th Anniversary |
| Premium | €42–€100 | Charizard Hunt, Legendary Chase, Sealed Premium |
| High Roller | €150–€500 | God Hit Pack, High Roller €250, High Roller €500 |

---

## Probar pagos (demo sin Stripe)

Si `STRIPE_SECRET_KEY` está vacío en `.env.local`, el botón **Recargar** añade saldo directamente sin pasar por Stripe. Perfecto para demos locales.

Para usar Stripe real: añade tus claves de https://stripe.com (modo test) en `.env.local`.

---

## Comandos útiles

```powershell
# Reiniciar la base de datos desde cero
npx.cmd prisma db push --force-reset
npx.cmd prisma db seed

# Ver la base de datos en el navegador
npx.cmd prisma studio

# Build de producción
npm.cmd run build
npm.cmd start
```

---

## Solución de problemas

**"Cannot find module" o error de importación**
```powershell
npx.cmd prisma generate
```

**"database does not exist" o error de SQLite**
```powershell
npx.cmd prisma db push
```

**La página carga pero no hay packs**
```powershell
npx.cmd prisma db seed
```

**Puerto 3000 ocupado**
```powershell
npm.cmd run dev -- --port 3001
# Luego abre http://localhost:3001
```

**Error "AUTH_SECRET" not set**  
Asegúrate de que `.env.local` existe y tiene `AUTH_SECRET="cualquier-string-largo"`.
