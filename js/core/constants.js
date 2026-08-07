/* =========================================================
   core/constants.js — Constantes estáticas de configuração (categorias por omissão, paleta de cores, navegação, textos fixos). Sem lógica.
   ========================================================= */

import { iconChart, iconHandshake, iconHome, iconMore, iconPie, iconReceipt, iconSwap, iconTarget, iconTrend } from './icons.js';

/* ----------------------- Constantes ----------------------- */
export const DEFAULT_EXPENSE_CATS = [
  { name: 'Alimentação', color: '#c9a227' },
  { name: 'Transporte', color: '#4fa37b' },
  { name: 'Moradia', color: '#7a8fa6' },
  { name: 'Saúde', color: '#c0563e' },
  { name: 'Educação', color: '#8b6dae' },
  { name: 'Lazer', color: '#d4915d' },
  { name: 'Compras', color: '#5ea8a0' },
  { name: 'Outros', color: '#8fa396' },
  { name: 'Roupas do Dia a Dia', color: '#6fb88a' },
  { name: 'Ocasiões Especiais', color: '#a8763e' },
  { name: 'Calçados & Acessórios', color: '#5a7fc4' },
  { name: 'Manutenção de Roupas', color: '#c46f9e' },
  { name: 'Apoio Familiar / Emergências', color: '#9c7b4f' },
  { name: 'Social & Lazer Informal', color: '#5b8fae' },
  { name: 'Pequenos Gastos', color: '#a55b6b' },
  { name: 'Manutenção Doméstica', color: '#7fa65a' }
];

export const DEFAULT_INCOME_CATS = [
  { name: 'Salário', color: '#4fa37b' },
  { name: 'Freelance', color: '#6fb88a' },
  { name: 'Investimentos', color: '#c9a227' },
  { name: 'Outros', color: '#8fa396' }
];

export const CATEGORY_PALETTE = ['#c9a227', '#4fa37b', '#c0563e', '#7a8fa6', '#8b6dae', '#d4915d', '#5ea8a0', '#8fa396', '#6fb88a', '#a8763e', '#5a7fc4', '#c46f9e', '#9c7b4f', '#5b8fae', '#a55b6b', '#7fa65a'];

export const INVESTMENT_TYPES = ['Poupança', 'Ações', 'Fundos', 'Imóveis', 'Criptomoeda', 'Outros'];

export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/* ----------------------- Tema (claro / escuro / automático) ----------------------- */
export const THEME_STORAGE_KEY = 'nubolso-theme';

export const THEME_LABELS = { light: 'Claro', dark: 'Escuro', system: 'Automático' };

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: iconHome },
  { id: 'transacoes', label: 'Lançar', icon: iconSwap },
  { id: 'orcamento', label: 'Orçamento', icon: iconPie },
  { id: 'bi', label: 'BI', icon: iconChart },
  { id: 'mais', label: 'Mais', icon: iconMore }
];

/* Sidebar de desktop: mostra mais itens de primeiro nível de uma vez, já que há espaço. */
export const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: iconHome },
  { id: 'transacoes', label: 'Lançar', icon: iconSwap },
  { id: 'orcamento', label: 'Orçamento', icon: iconPie },
  { id: 'bi', label: 'BI', icon: iconChart },
  { id: 'contas', label: 'Contas', icon: iconReceipt },
  { id: 'dividas', label: 'Kilapes', icon: iconHandshake },
  { id: 'investimentos', label: 'Investimentos', icon: iconTrend },
  { id: 'metas', label: 'Metas', icon: iconTarget }
];

export const BI_SECTIONS = [
  { id: 'geral', label: 'Geral' },
  { id: 'tendencias', label: 'Tendências' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'cruzada', label: 'Cruzada' },
  { id: 'projecoes', label: 'Projeções' }
];
