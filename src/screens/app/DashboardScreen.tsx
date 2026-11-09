import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, useWindowDimensions, I18nManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {AppStackParamList} from '../../navigation/AppNavigator';
import {useAuth} from '../../contexts/AuthContext';
import {useLanguage} from '../../contexts/LanguageContext';
import {getMonthlySummaryApi, getCategorySummaryApi, getMonthlyRecapApi} from '../../lib/services/expenses.service';
import {MonthlySummary, CategorySummary} from '../../types';

function currentMonthValue() {return new Date().toISOString().slice(0, 7);}

function monthLabel(yyyymm: string, locale: string) {
  const [year, month] = yyyymm.split('-').map(Number);
  return new Date(year, month - 1).toLocaleString(locale, {month: 'long', year: 'numeric'});
}

function prevMonth(yyyymm: string) {
  const [year, month] = yyyymm.split('-').map(Number);
  if (month === 1) {return `${year - 1}-12`;}
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

function nextMonth(yyyymm: string) {
  const [year, month] = yyyymm.split('-').map(Number);
  if (month === 12) {return `${year + 1}-01`;}
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getGreetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) {return 'morning';}
  if (h < 18) {return 'afternoon';}
  return 'evening';
}

type Tab = 'overview' | 'insights';

export default function DashboardScreen() {
  const {t} = useTranslation();
  const {language} = useLanguage();
  const {user} = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const currency = user?.homeCurrency || 'USD';

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [recap, setRecap] = useState('');
  const [recapLoading, setRecapLoading] = useState(false);

  function fmt(amount: number) {
    return new Intl.NumberFormat(language, {style: 'currency', currency, minimumFractionDigits: 0}).format(amount);
  }

  const loadCategories = useCallback((month: string) => {
    setCategoryLoading(true);
    getCategorySummaryApi(month)
      .then(setCategorySummary)
      .catch(() => {})
      .finally(() => setCategoryLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSummaryLoading(true);
      getMonthlySummaryApi()
        .then(setMonthlySummary)
        .catch(() => {})
        .finally(() => setSummaryLoading(false));
      loadCategories(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadCategories]),
  );

  useEffect(() => {
    loadCategories(selectedMonth);
  }, [selectedMonth, loadCategories]);

  async function handleGenerateRecap() {
    setRecapLoading(true);
    try {
      const {recap: text} = await getMonthlyRecapApi(selectedMonth);
      setRecap(text);
    } catch {
      setRecap(t('dashboard.errorRecap'));
    } finally {
      setRecapLoading(false);
    }
  }

  const currentMonth = currentMonthValue();
  const selectedSummary = monthlySummary.find(m => m.month === selectedMonth);
  const total = selectedSummary?.total ?? 0;
  const count = selectedSummary?.count ?? 0;
  const isCurrentMonth = selectedMonth === currentMonth;
  const maxBar = Math.max(...monthlySummary.map(m => m.total), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, {paddingTop: insets.top + 16}]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t(`dashboard.greeting.${getGreetingKey()}`)}, {user?.name?.split(' ')[0] || t('dashboard.greetingFallbackName')} 👋</Text>
          <Text style={styles.subGreeting}>{t('dashboard.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.avatarBtn}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['overview', 'insights'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {t(`dashboard.tabs.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scan CTA */}
      <TouchableOpacity style={styles.scanCta} onPress={() => navigation.navigate('Tabs' as any, {screen: 'Scan'} as any)}>
        <View style={{flex: 1}}>
          <Text style={styles.scanCtaSub}>{t('dashboard.scanCta.eyebrow')}</Text>
          <Text style={styles.scanCtaTitle}>{t('dashboard.scanCta.title')}</Text>
          <Text style={styles.scanCtaDesc}>{t('dashboard.scanCta.subtitle')}</Text>
        </View>
        <View style={styles.scanCtaIcon}>
          <Text style={{fontSize: 28}}>📷</Text>
        </View>
      </TouchableOpacity>

      {/* Month selector */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => setSelectedMonth(prevMonth(selectedMonth))} style={styles.monthArrow}>
          <Text style={[styles.monthArrowText, I18nManager.isRTL && styles.flipGlyph]}>‹</Text>
        </TouchableOpacity>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.monthLabel}>{monthLabel(selectedMonth, language)}</Text>
          {!isCurrentMonth && (
            <TouchableOpacity onPress={() => setSelectedMonth(currentMonth)}>
              <Text style={styles.backToCurrent}>{t('dashboard.backToCurrent')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setSelectedMonth(nextMonth(selectedMonth))}
          disabled={isCurrentMonth}
          style={styles.monthArrow}>
          <Text style={[styles.monthArrowText, I18nManager.isRTL && styles.flipGlyph, isCurrentMonth && {opacity: 0.3}]}>›</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, {width: (width - 48) / 2}]}>
              <Text style={styles.statLabel}>{t('dashboard.stats.totalSpent')}</Text>
              {summaryLoading ? <ActivityIndicator color="#3e6378" /> : <Text style={styles.statValue}>{fmt(total)}</Text>}
            </View>
            <View style={[styles.statCard, {width: (width - 48) / 2}]}>
              <Text style={styles.statLabel}>{t('dashboard.stats.expenses')}</Text>
              {summaryLoading ? <ActivityIndicator color="#3e6378" /> : <Text style={styles.statValue}>{count}</Text>}
            </View>
          </View>

          {/* Monthly trend bars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('dashboard.monthlyTrend')}</Text>
            {summaryLoading ? (
              <ActivityIndicator color="#3e6378" style={{marginTop: 16}} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 12}}>
                <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 14, height: 164}}>
                  {monthlySummary.slice(-12).map(m => {
                    const h = monthlySummary.length === 1 ? 64 : Math.max((m.total / maxBar) * 90, 6);
                    const isSelected = m.month === selectedMonth;
                    return (
                      <TouchableOpacity
                        key={m.month}
                        onPress={() => setSelectedMonth(m.month)}
                        style={{alignItems: 'center', gap: 6}}>
                        <View style={styles.barValueSlot}>
                          {isSelected && <Text style={styles.barValue} numberOfLines={1}>{fmt(m.total)}</Text>}
                        </View>
                        <View style={[styles.bar, {height: h, backgroundColor: isSelected ? '#3e6378' : '#abc5d5'}]} />
                        <Text style={[styles.barLabel, isSelected && {color: '#3e6378', fontWeight: '700'}]}>
                          {new Date(m.month + '-01').toLocaleString(language, {month: 'short'})}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Category breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('dashboard.categoryBreakdown', {month: monthLabel(selectedMonth, language)})}</Text>
            {categoryLoading ? (
              <ActivityIndicator color="#3e6378" style={{marginTop: 16}} />
            ) : categorySummary.length === 0 ? (
              <Text style={styles.empty}>{t('dashboard.noExpensesThisMonth')}</Text>
            ) : (
              categorySummary.map(cat => {
                const budget = cat.budgetAmount;
                const pct = budget ? Math.min(cat.total / budget, 1) : null;
                const over = budget ? cat.total > budget : false;
                const barColor = !pct ? '#3e6378' : over ? '#EF4444' : pct >= 0.8 ? '#F59E0B' : '#3fa89d';
                return (
                  <View key={cat.categoryId} style={styles.catRow}>
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                    <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={styles.catName}>{cat.categoryName}</Text>
                        <Text style={styles.catTotal}>{fmt(cat.total)}</Text>
                      </View>
                      {budget != null && (
                        <View style={styles.budgetBar}>
                          <View style={[styles.budgetFill, {width: `${Math.min((cat.total / budget) * 100, 100)}%`, backgroundColor: barColor}]} />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {activeTab === 'insights' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.aiMonthlyRecap')}</Text>
          <Text style={styles.recapSub}>{monthLabel(selectedMonth, language)}</Text>
          {recap ? (
            <>
              <Text style={styles.recapText}>{recap}</Text>
              <TouchableOpacity onPress={handleGenerateRecap} disabled={recapLoading}>
                <Text style={styles.regenerate}>{recapLoading ? t('dashboard.regenerating') : t('dashboard.regenerate')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, recapLoading && {opacity: 0.6}]}
              onPress={handleGenerateRecap}
              disabled={recapLoading}>
              <Text style={styles.buttonText}>{recapLoading ? t('dashboard.generating') : t('dashboard.generateRecap')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {padding: 16, gap: 12, paddingBottom: 32},
  scanCta: {
    backgroundColor: '#3e6378', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  scanCtaSub: {fontSize: 11, color: '#81a8c0', fontWeight: '600', marginBottom: 4},
  scanCtaTitle: {fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2},
  scanCtaDesc: {fontSize: 12, color: '#abc5d5'},
  scanCtaIcon: {
    width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  greeting: {fontSize: 20, fontWeight: '700', color: '#111827'},
  subGreeting: {fontSize: 13, color: '#6B7280', marginTop: 2},
  avatarBtn: {
    width: 36, height: 36, backgroundColor: '#3e6378',
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontWeight: '700', fontSize: 14},
  tabBar: {flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, gap: 4},
  tabBtn: {flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center'},
  tabBtnActive: {backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2},
  tabLabel: {fontSize: 13, fontWeight: '500', color: '#6B7280'},
  tabLabelActive: {color: '#111827', fontWeight: '600'},
  monthRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12},
  monthArrow: {padding: 4},
  monthArrowText: {fontSize: 24, color: '#374151'},
  flipGlyph: {transform: [{scaleX: -1}]},
  monthLabel: {fontSize: 15, fontWeight: '600', color: '#111827'},
  backToCurrent: {fontSize: 11, color: '#3e6378', marginTop: 2, textAlign: 'center'},
  statsRow: {flexDirection: 'row', gap: 12},
  statCard: {backgroundColor: '#fff', borderRadius: 16, padding: 16},
  statLabel: {fontSize: 10, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5, marginBottom: 6},
  statValue: {fontSize: 22, fontWeight: '700', color: '#111827'},
  card: {backgroundColor: '#fff', borderRadius: 16, padding: 16},
  cardTitle: {fontSize: 15, fontWeight: '600', color: '#111827'},
  bar: {width: 34, borderRadius: 6},
  barValueSlot: {height: 16, justifyContent: 'flex-end'},
  barValue: {fontSize: 10, fontWeight: '700', color: '#3e6378'},
  barLabel: {fontSize: 11, color: '#9CA3AF'},
  catRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6'},
  catIcon: {fontSize: 20},
  catName: {fontSize: 13, color: '#374151', fontWeight: '500'},
  catTotal: {fontSize: 13, fontWeight: '600', color: '#111827'},
  budgetBar: {height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, marginTop: 4},
  budgetFill: {height: 4, borderRadius: 2},
  empty: {fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 16},
  recapSub: {fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 12},
  recapText: {fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12},
  regenerate: {fontSize: 13, color: '#3e6378'},
  button: {backgroundColor: '#3e6378', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8},
  buttonText: {color: '#fff', fontWeight: '600', fontSize: 14},
});
