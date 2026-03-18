import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/template';
import { logStartup, logStartupError } from '@/utils/startupDiagnostics';
import { Colors } from '@/constants/theme';

const supabase = getSupabaseClient();

export default function IndexScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const checkAuthAndOnboarding = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        logStartup('auth: no active user, redirecting to /auth/email');
        // Not authenticated -> go to auth
        router.replace('/auth/email');
        return;
      }

      const [{ data: profile, error: profileError }, { data: ratings, error: ratingsError }] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('username')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_ratings')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
      ]);

      if (profileError || !profile?.username) {
        logStartup('auth: profile incomplete, redirecting to /onboarding');
        // Profile incomplete -> continue onboarding
        router.replace('/onboarding');
        return;
      }

      if (ratingsError || !ratings || ratings.length === 0) {
        logStartup('auth: no ratings, redirecting to /onboarding');
        // No sports/ratings set -> continue onboarding
        router.replace('/onboarding');
        return;
      }

      // Everything complete -> go to dashboard
      logStartup('auth: complete, redirecting to /(tabs)/dashboard');
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('Auth check error:', error);
      const message = error instanceof Error ? error.message : 'Unknown auth init error';
      logStartupError(`auth init failed: ${message}`);
      router.replace('/auth/email');
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    logStartup('auth: starting session check');
    checkAuthAndOnboarding();
  }, [checkAuthAndOnboarding]);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
