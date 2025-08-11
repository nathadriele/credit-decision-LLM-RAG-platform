// =============================================================================
// MONITORING & OBSERVABILITY TYPES
// =============================================================================

import { IBaseEntity } from './common';

// =============================================================================
// METRICS TYPES
// =============================================================================

export interface IMetric {
  name: string;
  value: number;
  unit: MetricUnit;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export enum MetricUnit {
  COUNT = 'count',
  RATE = 'rate',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
  BYTES = 'bytes',
  PERCENT = 'percent',
  MILLISECONDS = 'milliseconds',
  SECONDS = 'seconds',
}

export interface IMetricSeries {
  name: string;
  dataPoints: IDataPoint[];
  metadata: ISeriesMetadata;
}

export interface IDataPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface ISeriesMetadata {
  unit: MetricUnit;
  description: string;
  aggregation: AggregationType;
  interval: string;
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  PERCENTILE_50 = 'p50',
  PERCENTILE_95 = 'p95',
  PERCENTILE_99 = 'p99',
}

// =============================================================================
// LOGGING TYPES
// =============================================================================

export interface ILogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  logger: string;
  context?: ILogContext;
  error?: ILogError;
  metadata?: Record<string, unknown>;
}

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface ILogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  service: string;
  version: string;
  environment: string;
}

export interface ILogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: ILogError;
}

// =============================================================================
// TRACING TYPES
// =============================================================================

export interface ITrace {
  traceId: string;
  spans: ISpan[];
  duration: number;
  startTime: Date;
  endTime: Date;
  status: TraceStatus;
  metadata: Record<string, unknown>;
}

export interface ISpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: SpanStatus;
  tags: Record<string, string>;
  logs: ISpanLog[];
  references?: ISpanReference[];
}

export enum TraceStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export enum SpanStatus {
  OK = 'OK',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export interface ISpanLog {
  timestamp: Date;
  fields: Record<string, unknown>;
}

export interface ISpanReference {
  type: ReferenceType;
  spanId: string;
}

export enum ReferenceType {
  CHILD_OF = 'CHILD_OF',
  FOLLOWS_FROM = 'FOLLOWS_FROM',
}

// =============================================================================
// ALERT TYPES
// =============================================================================

export interface IAlert extends IBaseEntity {
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  condition: IAlertCondition;
  notifications: INotificationChannel[];
  metadata: IAlertMetadata;
  history: IAlertHistory[];
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  SUPPRESSED = 'SUPPRESSED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
}

export interface IAlertCondition {
  metric: string;
  operator: ComparisonOperator;
  threshold: number;
  duration: string;
  aggregation: AggregationType;
  filters?: Record<string, string>;
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
}

export interface INotificationChannel {
  type: NotificationChannelType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export enum NotificationChannelType {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK',
  SMS = 'SMS',
  PAGERDUTY = 'PAGERDUTY',
  TEAMS = 'TEAMS',
}

export interface IAlertMetadata {
  tags: string[];
  runbook?: string;
  escalationPolicy?: string;
  suppressionRules?: ISuppressionRule[];
}

export interface ISuppressionRule {
  condition: string;
  duration: string;
  reason: string;
}

export interface IAlertHistory {
  timestamp: Date;
  status: AlertStatus;
  value: number;
  message: string;
  acknowledgedBy?: string;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface IDashboard extends IBaseEntity {
  name: string;
  description: string;
  layout: IDashboardLayout;
  widgets: IWidget[];
  filters: IDashboardFilter[];
  permissions: IDashboardPermission[];
  isPublic: boolean;
  tags: string[];
}

export interface IDashboardLayout {
  type: LayoutType;
  columns: number;
  rows: number;
  responsive: boolean;
}

export enum LayoutType {
  GRID = 'GRID',
  FLOW = 'FLOW',
  FIXED = 'FIXED',
}

export interface IWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: IWidgetPosition;
  size: IWidgetSize;
  config: IWidgetConfig;
  dataSource: IDataSource;
}

export enum WidgetType {
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  GAUGE = 'GAUGE',
  COUNTER = 'COUNTER',
  TABLE = 'TABLE',
  HEATMAP = 'HEATMAP',
  TEXT = 'TEXT',
  LOG_VIEWER = 'LOG_VIEWER',
}

export interface IWidgetPosition {
  x: number;
  y: number;
}

export interface IWidgetSize {
  width: number;
  height: number;
}

export interface IWidgetConfig {
  title?: string;
  subtitle?: string;
  colors?: string[];
  axes?: IAxisConfig[];
  legend?: ILegendConfig;
  thresholds?: IThreshold[];
  refreshInterval?: number;
  timeRange?: ITimeRange;
}

export interface IAxisConfig {
  label: string;
  min?: number;
  max?: number;
  unit?: string;
  scale?: ScaleType;
}

export enum ScaleType {
  LINEAR = 'LINEAR',
  LOGARITHMIC = 'LOGARITHMIC',
}

export interface ILegendConfig {
  show: boolean;
  position: LegendPosition;
}

export enum LegendPosition {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export interface IThreshold {
  value: number;
  color: string;
  label?: string;
}

export interface ITimeRange {
  from: Date | string;
  to: Date | string;
  relative?: string;
}

export interface IDataSource {
  type: DataSourceType;
  query: string;
  parameters?: Record<string, unknown>;
  aggregation?: AggregationType;
  groupBy?: string[];
}

export enum DataSourceType {
  METRICS = 'METRICS',
  LOGS = 'LOGS',
  TRACES = 'TRACES',
  DATABASE = 'DATABASE',
  API = 'API',
}

export interface IDashboardFilter {
  name: string;
  type: FilterType;
  values: string[];
  defaultValue?: string;
}

export enum FilterType {
  DROPDOWN = 'DROPDOWN',
  MULTI_SELECT = 'MULTI_SELECT',
  TEXT_INPUT = 'TEXT_INPUT',
  DATE_PICKER = 'DATE_PICKER',
  TIME_RANGE = 'TIME_RANGE',
}

export interface IDashboardPermission {
  userId?: string;
  roleId?: string;
  permission: DashboardPermissionType;
}

export enum DashboardPermissionType {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  ADMIN = 'ADMIN',
}

// =============================================================================
// PERFORMANCE MONITORING TYPES
// =============================================================================

export interface IPerformanceMetrics {
  responseTime: IResponseTimeMetrics;
  throughput: IThroughputMetrics;
  errorRate: IErrorRateMetrics;
  resourceUsage: IResourceUsageMetrics;
  timestamp: Date;
}

export interface IResponseTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

export interface IThroughputMetrics {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface IErrorRateMetrics {
  total: number;
  rate: number;
  byStatusCode: Record<number, number>;
  byErrorType: Record<string, number>;
}

export interface IResourceUsageMetrics {
  cpu: ICpuMetrics;
  memory: IMemoryMetrics;
  disk: IDiskMetrics;
  network: INetworkMetrics;
}

export interface ICpuMetrics {
  usage: number;
  cores: number;
  loadAverage: number[];
}

export interface IMemoryMetrics {
  used: number;
  total: number;
  usage: number;
  heap?: IHeapMetrics;
}

export interface IHeapMetrics {
  used: number;
  total: number;
  size: number;
}

export interface IDiskMetrics {
  used: number;
  total: number;
  usage: number;
  iops: number;
}

export interface INetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connections: number;
}

// =============================================================================
// SLA/SLO TYPES
// =============================================================================

export interface ISLO extends IBaseEntity {
  name: string;
  description: string;
  target: number;
  indicator: ISLOIndicator;
  timeWindow: ITimeWindow;
  alerting: ISLOAlerting;
  status: SLOStatus;
  currentValue: number;
  errorBudget: IErrorBudget;
}

export interface ISLOIndicator {
  type: SLOIndicatorType;
  metric: string;
  goodQuery: string;
  totalQuery: string;
}

export enum SLOIndicatorType {
  AVAILABILITY = 'AVAILABILITY',
  LATENCY = 'LATENCY',
  ERROR_RATE = 'ERROR_RATE',
  THROUGHPUT = 'THROUGHPUT',
}

export interface ITimeWindow {
  type: TimeWindowType;
  duration: string;
  calendar?: ICalendarWindow;
}

export enum TimeWindowType {
  ROLLING = 'ROLLING',
  CALENDAR = 'CALENDAR',
}

export interface ICalendarWindow {
  startDay: number;
  startTime: string;
  timezone: string;
}

export interface ISLOAlerting {
  burnRateAlerts: IBurnRateAlert[];
  errorBudgetAlerts: IErrorBudgetAlert[];
}

export interface IBurnRateAlert {
  threshold: number;
  lookbackWindow: string;
  severity: AlertSeverity;
}

export interface IErrorBudgetAlert {
  threshold: number;
  severity: AlertSeverity;
}

export enum SLOStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  BREACHED = 'BREACHED',
}

export interface IErrorBudget {
  total: number;
  consumed: number;
  remaining: number;
  percentage: number;
  burnRate: number;
}
