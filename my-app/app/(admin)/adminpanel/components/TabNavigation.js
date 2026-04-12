'use client';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function TabNavigation() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useAdminTabs();

  if (!tabs || tabs.length === 0) {
    return null;
  }

  const handleTabClick = (tabId) => {
    // Use setTimeout to move the state update out of the render cycle
    setTimeout(() => {
      setActiveTabId(tabId);
    }, 0);
  };

  const handleTabClose = (e, tabId) => {
    e.stopPropagation();
    // Use setTimeout to move the state update out of the render cycle
    setTimeout(() => {
      closeTab(tabId);
    }, 0);
  };

  return (
    <div className="tab-navigation">
      <div className="tabs">
        {tabs.map((tab) => {
          // Ensure tab.id exists and is unique
          const tabKey = `tab-${tab.id || Math.random()}`;
          return (
            <div
              key={tabKey}
              className={`tab ${activeTabId === tab.id ? 'active' : ''} ${tab.isModified ? 'modified' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <button
                className="close-button"
                onClick={(e) => handleTabClose(e, tab.id)}
                title="Close tab"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 