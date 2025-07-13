import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '../../contexts/FamilyContext';
import { analyticsApi } from '../../services/api';
import type { TaskSplitAnalytics } from '../../types';
import './Analytics.css';

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<TaskSplitAnalytics | null>(null);
  const [fairnessHistory, setFairnessHistory] = useState<Array<{ week: Date; fairnessScore: number }> | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'4weeks' | '8weeks' | '12weeks' | 'custom'>('4weeks');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showVirtualMembers, setShowVirtualMembers] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<Array<{id: string; name: string; isVirtual: boolean}>>([]);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentFamily) {
      fetchAnalyticsData();
      fetchFairnessHistory();
    }
  }, [currentFamily, selectedTimeframe, customDateRange, showVirtualMembers, selectedMemberIds]);

  useEffect(() => {
    if (analyticsData) {
      // Extract all members from analytics data
      const members = analyticsData.memberStats.map(member => ({
        id: member.memberId,
        name: member.memberName,
        isVirtual: member.isVirtual
      }));
      setAllMembers(members);
    }
  }, [analyticsData]);

  const fetchAnalyticsData = async () => {
    if (!currentFamily) return;
    
    try {
      setLoading(true);
      setError(null);

      let periodDays: number;
      let referenceDate: string | undefined;

      switch (selectedTimeframe) {
        case '4weeks':
          periodDays = 28;
          break;
        case '8weeks':
          periodDays = 56;
          break;
        case '12weeks':
          periodDays = 84;
          break;
        case 'custom':
          if (customDateRange.endDate && customDateRange.startDate) {
            const start = new Date(customDateRange.startDate);
            const end = new Date(customDateRange.endDate);
            periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            referenceDate = customDateRange.endDate;
          } else {
            periodDays = 28; // fallback
          }
          break;
        default:
          periodDays = 28;
      }

      const response = await analyticsApi.getTaskSplit(currentFamily.id, referenceDate, periodDays);
      setAnalyticsData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFairnessHistory = async () => {
    if (!currentFamily) return;
    
    try {
      const weeks = Math.ceil(getPeriodDays() / 7);
      const response = await analyticsApi.getFairnessHistory(currentFamily.id, weeks);
      setFairnessHistory(response.data.data);
    } catch (err) {
      // Silently fail for fairness history - it's optional data
    }
  };

  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const realMembers = analyticsData.memberStats.filter(member => !member.isVirtual);
    const topPerformer = realMembers.length > 0 ? realMembers[0] : null;
    const timeframeDays = getPeriodDays();

    return (
      <div className="analytics-subsection">
        <div className="analytics-subsection-header">
          <h3 className="analytics-subsection-title">{t('analytics.monthlyOverview')}</h3>
        </div>
        
        <div className="analytics-overview-grid">
          <div className="analytics-overview-card">
            <div className="analytics-overview-card-header">
              <h4>{t('analytics.fairnessScore')}</h4>
              <span className="analytics-overview-card-meta">{timeframeDays} {t('analytics.days')}</span>
            </div>
            <div className="analytics-overview-card-content">
              <div className="analytics-overview-value">{analyticsData.fairnessScore}%</div>
              <div className="analytics-overview-label">{getFairnessLabel(analyticsData.fairnessScore)}</div>
            </div>
          </div>
          
          <div className="analytics-overview-card">
            <div className="analytics-overview-card-header">
              <h4>{t('analytics.totalTime')}</h4>
              <span className="analytics-overview-card-meta">{realMembers.length} {t('analytics.members')}</span>
            </div>
            <div className="analytics-overview-card-content">
              <div className="analytics-overview-value">{Math.floor(analyticsData.totalMinutes / 60)}h</div>
              <div className="analytics-overview-label">{analyticsData.totalMinutes % 60}m</div>
            </div>
          </div>

          {topPerformer && (
            <div className="analytics-overview-card">
              <div className="analytics-overview-card-header">
                <h4>{t('analytics.topPerformer')}</h4>
                <span className="analytics-overview-card-meta">{Math.round(topPerformer.percentage)}%</span>
              </div>
              <div className="analytics-overview-card-content">
                <div className="analytics-overview-value">{topPerformer.firstName}</div>
                <div className="analytics-overview-label">{Math.floor(topPerformer.totalMinutes / 60)}h {topPerformer.totalMinutes % 60}m</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMemberScores = () => {
    if (!analyticsData?.memberStats) return null;

    const filteredMembers = analyticsData.memberStats.filter(member => {
      // Filter by virtual member setting
      if (!showVirtualMembers && member.isVirtual) return false;
      
      // Filter by selected members (if any selected)
      if (selectedMemberIds.length > 0 && !selectedMemberIds.includes(member.memberId)) return false;
      
      return true;
    });

    return (
      <div className="analytics-subsection">
        <div className="analytics-subsection-header">
          <h3 className="analytics-subsection-title">{t('analytics.memberScores')}</h3>
        </div>
        
        <div className="analytics-table">
          <div className="analytics-table-header">
            <div className="analytics-table-cell">{t('analytics.member')}</div>
            <div className="analytics-table-cell">{t('analytics.totalTime')}</div>
            <div className="analytics-table-cell">{t('analytics.taskCount')}</div>
            <div className="analytics-table-cell">{t('analytics.percentage')}</div>
            <div className="analytics-table-cell">{t('analytics.avgPerTask')}</div>
          </div>
          {filteredMembers.map((member) => (
            <React.Fragment key={member.memberId}>
              <div 
                className={`analytics-table-row ${expandedMembers.has(member.memberId) ? 'expanded' : ''}`}
                onClick={() => toggleMemberExpansion(member.memberId)}
                style={{ cursor: 'pointer' }}
              >
                <div className="analytics-table-cell analytics-member-name">
                  <span className="analytics-expand-icon">
                    {expandedMembers.has(member.memberId) ? '▼' : '▶'}
                  </span>
                  {member.memberName}
                  {member.isVirtual && <span className="analytics-virtual-badge">{t('analytics.virtual')}</span>}
                </div>
                <div className="analytics-table-cell">
                  {Math.floor(member.totalMinutes / 60)}h {member.totalMinutes % 60}m
                </div>
                <div className="analytics-table-cell">{member.taskCount}</div>
                <div className="analytics-table-cell analytics-percentage-cell">
                  <div className="analytics-percentage-bar">
                    <div 
                      className="analytics-percentage-bar-fill"
                      style={{ width: `${member.percentage}%` }}
                    />
                  </div>
                  <span className="analytics-percentage-text">{Math.round(member.percentage)}%</span>
                </div>
                <div className="analytics-table-cell">
                  {member.taskCount > 0 ? Math.round(member.totalMinutes / member.taskCount) : 0}m
                </div>
              </div>
              
              {expandedMembers.has(member.memberId) && (
                <div className="analytics-member-details">
                  <div className="analytics-member-details-content">
                    <h4>Task Breakdown for {member.memberName}</h4>
                    <div className="analytics-breakdown-stats">
                      <div className="analytics-stat-item">
                        <label>Average task duration:</label>
                        <span>{member.taskCount > 0 ? Math.round(member.totalMinutes / member.taskCount) : 0} minutes</span>
                      </div>
                      <div className="analytics-stat-item">
                        <label>Share of total workload:</label>
                        <span>{Math.round(member.percentage * 100) / 100}%</span>
                      </div>
                      <div className="analytics-stat-item">
                        <label>Efficiency score:</label>
                        <span className={`analytics-efficiency-score ${member.percentage > 25 ? 'high' : member.percentage > 15 ? 'medium' : 'low'}`}>
                          {member.percentage > 25 ? 'High' : member.percentage > 15 ? 'Medium' : 'Low'} contributor
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderFairnessChart = () => {
    if (!fairnessHistory || fairnessHistory.length === 0) return null;

    const maxScore = 100;
    const minScore = 0;
    const chartHeight = 200;
    const chartWidth = 600;
    const padding = 40;

    // Prepare data points
    const points = fairnessHistory.map((item, index) => {
      const x = padding + (index / (fairnessHistory.length - 1)) * (chartWidth - 2 * padding);
      const y = chartHeight - padding - ((item.fairnessScore - minScore) / (maxScore - minScore)) * (chartHeight - 2 * padding);
      return { x, y, score: item.fairnessScore, date: item.week };
    });

    return (
      <div className="analytics-subsection">
        <div className="analytics-subsection-header">
          <h3 className="analytics-subsection-title">Fairness Trend</h3>
        </div>
        
        <div className="analytics-chart-container">
          <svg width={chartWidth} height={chartHeight} className="analytics-chart-svg">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(score => {
              const y = chartHeight - padding - ((score - minScore) / (maxScore - minScore)) * (chartHeight - 2 * padding);
              return (
                <g key={score}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding - 10}
                    y={y + 4}
                    fontSize="12"
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {score}%
                  </text>
                </g>
              );
            })}
            
            {/* Chart line */}
            <polyline
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Data points */}
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#6366f1"
                stroke="white"
                strokeWidth="2"
              >
                <title>{`Week ${index + 1}: ${point.score}%`}</title>
              </circle>
            ))}
          </svg>
          
          <div className="analytics-chart-legend">
            <div className="analytics-chart-legend-item">
              <div className="analytics-chart-legend-color"></div>
              <span>Fairness Score</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getPeriodDays = () => {
    switch (selectedTimeframe) {
      case '4weeks': return 28;
      case '8weeks': return 56;
      case '12weeks': return 84;
      case 'custom': 
        if (customDateRange.endDate && customDateRange.startDate) {
          const start = new Date(customDateRange.startDate);
          const end = new Date(customDateRange.endDate);
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 28;
      default: return 28;
    }
  };

  const getFairnessLabel = (score: number) => {
    if (score >= 90) return 'Fair';
    if (score >= 70) return 'OK';
    return 'Unfair';
  };

  const exportData = () => {
    if (!analyticsData) return;

    const exportJson = {
      exportDate: new Date().toISOString(),
      timeframe: selectedTimeframe,
      periodDays: getPeriodDays(),
      fairnessScore: analyticsData.fairnessScore,
      totalMinutes: analyticsData.totalMinutes,
      averageMinutesPerMember: analyticsData.averageMinutesPerMember,
      memberStats: analyticsData.memberStats.map(member => ({
        memberName: member.memberName,
        isVirtual: member.isVirtual,
        totalMinutes: member.totalMinutes,
        taskCount: member.taskCount,
        percentage: Math.round(member.percentage * 100) / 100
      })),
      fairnessHistory: fairnessHistory
    };

    const blob = new Blob([JSON.stringify(exportJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleMemberExpansion = (memberId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  const renderFilters = () => {
    return (
      <div className="analytics-subsection">
        <div className="analytics-subsection-header">
          <h3 className="analytics-subsection-title">Filters & Settings</h3>
        </div>
        
        <div className="analytics-form">
          <div className="analytics-form-row">
            <div className="analytics-form-group">
              <label className="analytics-form-label">{t('analytics.timeframe')}</label>
              <select 
                value={selectedTimeframe} 
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="analytics-form-input"
              >
                <option value="4weeks">Last 4 Weeks</option>
                <option value="8weeks">Last 8 Weeks</option>
                <option value="12weeks">Last 12 Weeks</option>
                <option value="custom">{t('analytics.customRange')}</option>
              </select>
            </div>

            {selectedTimeframe === 'custom' && (
              <div className="analytics-form-group">
                <label className="analytics-form-label">Date Range</label>
                <div className="analytics-date-range">
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="analytics-form-input"
                  />
                  <span className="analytics-date-separator">to</span>
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="analytics-form-input"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="analytics-form-row">
            <div className="analytics-form-group">
              <label className="analytics-checkbox-label">
                <input
                  type="checkbox"
                  checked={showVirtualMembers}
                  onChange={(e) => setShowVirtualMembers(e.target.checked)}
                />
                {t('analytics.includeVirtualMembers')}
              </label>
            </div>

            {allMembers.length > 0 && (
              <div className="analytics-form-group">
                <label className="analytics-form-label">Filter Members</label>
                <select
                  multiple
                  value={selectedMemberIds}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedMemberIds(values);
                  }}
                  className="analytics-form-input analytics-member-select"
                  size={Math.min(allMembers.length, 4)}
                >
                  {allMembers
                    .filter(member => showVirtualMembers || !member.isVirtual)
                    .map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.isVirtual ? '(Virtual)' : ''}
                      </option>
                    ))}
                </select>
                {selectedMemberIds.length > 0 && (
                  <button
                    type="button"
                    className="analytics-button analytics-button-secondary analytics-button-sm"
                    onClick={() => setSelectedMemberIds([])}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="analytics-management">
        <div className="analytics-management-header">
          <h2 className="analytics-management-title">{t('analytics.title')}</h2>
        </div>
        <div className="analytics-management-content">
          <div className="analytics-loading">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-management">
        <div className="analytics-management-header">
          <h2 className="analytics-management-title">{t('analytics.title')}</h2>
        </div>
        <div className="analytics-management-content">
          <div className="analytics-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-management">
      <div className="analytics-management-header">
        <h2 className="analytics-management-title">{t('analytics.title')}</h2>
        {analyticsData && (
          <button
            onClick={exportData}
            className="analytics-export-btn"
            title="Export analytics data"
          >
            📊 Export Data
          </button>
        )}
      </div>
      
      <div className="analytics-management-content">
        {renderFilters()}
        {renderOverviewCards()}
        {renderFairnessChart()}
        {renderMemberScores()}
      </div>
    </div>
  );
};

export default Analytics;