// components/admin/charts/index.tsx
'use client';

/**
 * Wrapper pour les composants Recharts avec lazy-loading
 * Importez ce fichier via dynamic() pour éviter le bundle bloat
 */

export {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export type {
  LineChartProps,
  LineProps,
  BarChartProps,
  BarProps,
  XAxisProps,
  YAxisProps,
  CartesianGridProps,
  TooltipProps,
  LegendProps,
  ResponsiveContainerProps,
} from 'recharts';