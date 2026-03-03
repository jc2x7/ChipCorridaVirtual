# ChipCorrida Virtual

App mobile que substitui o chip físico de corrida por rastreamento GPS em tempo real.

## Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK 52 + React Native 0.76 |
| Navegação | Expo Router v4 (file-based) |
| Backend/DB | Firebase v11 (Auth + Firestore + Storage) |
| Mapas | react-native-maps |
| GPS | expo-location + expo-task-manager |
| Estilização | NativeWind v4 (Tailwind CSS) |
| Estado | Zustand |
| Formulários | React Hook Form + Zod |
| Ícones | @expo/vector-icons (Ionicons) |

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Habilite Authentication (Email/Password)
3. Habilite Firestore Database
4. Habilite Storage
5. Copie `.env.example` para `.env` e preencha as credenciais:

```bash
cp .env.example .env
```

### 3. Regras do Firestore

No Console do Firebase, configure as seguintes regras:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users podem ler seu próprio perfil
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Corridas - admins gerenciam, todos lêem publicadas
    match /races/{raceId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Registrations
    match /registrations/{regId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Tracking
    match /race_tracking/{trackingId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. Google Maps API Key (Android)

1. Obtenha uma chave no [Google Cloud Console](https://console.cloud.google.com)
2. Habilite "Maps SDK for Android" e "Maps SDK for iOS"
3. Adicione no `.env`:
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=sua-chave-aqui
```

### 5. Executar

```bash
# Desenvolvimento
npx expo start

# Android
npx expo run:android

# iOS
npx expo run:ios
```

## Administrador padrão

O email `juliolemosdf@gmail.com` é automaticamente configurado como administrador ao se cadastrar. Senha recomendada: `123123j`

## Funcionalidades

### Para o organizador (admin)
- ✅ Criar e editar corridas com foto, descrição e data/hora
- ✅ Desenhar o percurso no mapa (polyline)
- ✅ Adicionar checkpoints com raio de validação de 100m
- ✅ Definir largada e chegada
- ✅ Gerenciar inscrições (aprovar/rejeitar)
- ✅ Adicionar atletas diretamente pelo email
- ✅ Iniciar e encerrar corridas
- ✅ Gerenciar outros administradores

### Para o atleta
- ✅ Cadastro com email, senha, nome, idade e sexo
- ✅ Visualizar corridas disponíveis
- ✅ Solicitar inscrição em corridas
- ✅ Rastreamento GPS em tempo real durante a corrida
- ✅ Validação automática de checkpoints (raio 100m)
- ✅ Rastreamento em segundo plano (app minimizado)
- ✅ Ranking ao vivo (Geral, Masculino, Feminino)
- ✅ Visualizar percurso no mapa

## Estrutura do projeto

```
app/
├── (auth)/          # Login e cadastro
├── (tabs)/          # Telas do atleta (tabs)
│   ├── races/       # Lista e detalhe de corridas + rastreamento
│   ├── my-races.tsx # Minhas corridas
│   └── profile.tsx  # Perfil do usuário
└── (admin)/         # Telas do organizador
    ├── races/       # Gestão de corridas
    └── admins.tsx   # Gestão de admins

services/    # Lógica de negócio e Firebase
stores/      # Estado global (Zustand)
hooks/       # Hooks customizados
components/  # Componentes reutilizáveis
types/       # TypeScript types
lib/         # Firebase config + utilitários
tasks/       # Background tasks
```

## Raio de validação

Os checkpoints utilizam um raio de **100 metros** para validação. Quando o atleta entra nesse raio, o checkpoint é automaticamente marcado como concluído e o ranking é atualizado em tempo real.

## Ranking

O ranking é calculado em tempo real com a seguinte ordem de prioridade:
1. Atletas que completaram a corrida (ordenados pelo menor tempo)
2. Atletas ainda em curso (ordenados pelo número de checkpoints passados)

Filtros disponíveis: Geral | Masculino | Feminino
