import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Status = 'checking' | 'connected' | 'error';

export function FirebaseStatusBadge() {
  const [status, setStatus] = useState<Status>('checking');
  const [log, setLog] = useState('Verificando conexão...');

  useEffect(() => {
    const check = async () => {
      try {
        console.log('[Firebase] Testando conexão com Firestore...');
        await getDoc(doc(db, '_health', 'ping'));
        setStatus('connected');
        setLog('Firestore conectado com sucesso');
        console.log('[Firebase] ✅ Conectado ao projeto: ' + db.app.options.projectId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus('error');
        setLog(msg);
        console.error('[Firebase] ❌ Erro de conexão:', msg);
      }
    };

    check();
  }, []);

  const dotColor =
    status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : '#f59e0b';

  const label =
    status === 'connected' ? 'Firebase conectado' :
    status === 'error'     ? 'Erro ao conectar' :
                             'Conectando...';

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: dotColor }]}>{label}</Text>
        <Text style={styles.log} numberOfLines={2}>{log}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  log: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
});
