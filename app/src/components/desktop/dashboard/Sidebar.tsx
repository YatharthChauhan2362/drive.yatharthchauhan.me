import { useEffect, useState } from 'react';
import { HardDrive, Folder, Plus, RefreshCw, LogOut, ChevronLeft, ChevronRight, Settings2, Trash2, Check, X, Eye, EyeOff, Clock3, Star, Pin, FileWarning, CalendarClock, Copy, Database, User, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SidebarItem } from './SidebarItem';
import { BandwidthWidget } from './BandwidthWidget';
import { TelegramFolder, BandwidthStats, FolderGroup, type SmartView } from '../../../types';
import { useSettings } from '../../../context/SettingsContext';
import {
    SortableContext,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { quietMetrics } from '../../../design/contracts';
import { CreateFolderDialog } from './CreateFolderDialog';
import { SyncStatusBadge } from '../sync/SyncStatusBadge';

const PRESET_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F59E0B', // Orange
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#EF4444', // Red
];

interface GroupTabProps {
    id: string;
    groupId: number | null | 'all';
    label: string;
    colorHex?: string;
    active: boolean;
    onClick: () => void;
    onEdit?: () => void;
    isSortable?: boolean;
}

function GroupTab({ id, groupId, label, colorHex, active, onClick, onEdit, isSortable = true }: GroupTabProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: { kind: 'sidebar-group', groupId },
        disabled: !isSortable ? { draggable: true, droppable: false } : false,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`quiet-control flex h-7 flex-shrink-0 cursor-pointer select-none items-center gap-1.5 border px-2 text-badge font-medium ${
                active
                    ? 'border-app-accent/30 bg-app-selected text-app-accent'
                    : 'border-app-border bg-app-surface text-app-text-secondary hover:border-app-border-strong hover:text-app-text'
            }`}
        >
            {colorHex && (
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colorHex }}
                />
            )}
            <span className="truncate max-w-[80px]">{label}</span>
            {onEdit && active && groupId !== 'all' && groupId !== null && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="rounded p-0.5 text-app-text-secondary hover:bg-app-hover hover:text-app-text"
                >
                    <Settings2 className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

interface SidebarProps {
    folders: TelegramFolder[];
    groups: FolderGroup[];
    activeFolderId: number | null;
    setActiveFolderId: (id: number | null) => void;
    onDelete: (id: number, name: string) => void;
    onRename: (id: number, name: string) => void;
    onToggleVisibility: (id: number, name: string, isPublic: boolean) => void;
    onExportInvite: (id: number, name: string) => void;
    onCreate: (name: string) => Promise<void>;
    isSyncing: boolean;
    isConnected: boolean;
    onSync: () => void;
    onLogout: () => void;
    bandwidth: BandwidthStats | null;
    onAssignFolderToGroup: (folderId: number, groupId: number | null) => Promise<void>;
    onCreateGroup: (name: string, colorHex: string) => Promise<void>;
    onUpdateGroup: (groupId: number, name: string, colorHex: string) => Promise<void>;
    onDeleteGroup: (groupId: number) => Promise<void>;
    createFolderRequest?: number;
    activeSmartView?: SmartView | null;
    onSmartViewChange?: (view: SmartView | null) => void;
    onSignOut?: () => void;
    onSwitchProfile?: (profileName: string) => Promise<void>;
    onDeleteProfile?: (profileName: string) => Promise<void>;
    profiles?: any[];
    activeProfile?: string | null;
}

export function Sidebar({
    folders, groups = [], activeFolderId, setActiveFolderId, onDelete, onRename, onToggleVisibility, onExportInvite, onCreate,
    isSyncing, isConnected, onSync, onLogout, bandwidth,
    onAssignFolderToGroup, onCreateGroup, onUpdateGroup, onDeleteGroup, createFolderRequest = 0, activeSmartView = null, onSmartViewChange,
    onSignOut, onSwitchProfile, onDeleteProfile, profiles = [], activeProfile = null
}: SidebarProps) {
    const handleLogoutAction = onSignOut || onLogout;
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [showProfileSelector, setShowProfileSelector] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
    const { t } = useTranslation();
    const { settings, updateSetting } = useSettings();

    const toggleFolderExpand = (folderId: number) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    // Grouping States
    const [activeGroupId, setActiveGroupId] = useState<number | null | 'all'>('all');
    const [showGroupEditor, setShowGroupEditor] = useState(false);
    const [editingGroup, setEditingGroup] = useState<FolderGroup | null>(null); // null means creating
    const [groupName, setGroupName] = useState("");
    const [groupColor, setGroupColor] = useState("#3B82F6");

    useEffect(() => {
        if (createFolderRequest > 0) setShowNewFolderInput(true);
    }, [createFolderRequest]);

    const handleSaveGroup = async () => {
        if (!groupName.trim()) return;
        if (editingGroup) {
            await onUpdateGroup(editingGroup.id, groupName, groupColor);
        } else {
            await onCreateGroup(groupName, groupColor);
        }
        setShowGroupEditor(false);
        setEditingGroup(null);
        setGroupName("");
        setGroupColor("#3B82F6");
    };

    const handleDeleteGroupClick = async (groupId: number) => {
        await onDeleteGroup(groupId);
        if (activeGroupId === groupId) {
            setActiveGroupId('all');
        }
        setShowGroupEditor(false);
        setEditingGroup(null);
        setGroupName("");
        setGroupColor("#3B82F6");
    };

    const filteredFolders = folders.filter(folder => {
        if (settings.hideGroups || activeGroupId === 'all') return true;
        if (activeGroupId === null) return folder.group_id === null || folder.group_id === undefined;
        return folder.group_id === activeGroupId;
    });

    const renderFolderItem = (folder: TelegramFolder, level: number = 0): React.ReactNode => {
        const children = filteredFolders.filter(f => f.parent_id === folder.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedFolders.has(folder.id);

        return (
            <div key={folder.id} className="flex flex-col">
                <SidebarItem
                    icon={Folder}
                    label={folder.name}
                    active={activeFolderId === folder.id && !activeSmartView}
                    onClick={() => { onSmartViewChange?.(null); setActiveFolderId(folder.id); }}
                    onDelete={() => onDelete(folder.id, folder.name)}
                    onRename={() => onRename(folder.id, folder.name)}
                    onToggleVisibility={() => onToggleVisibility(folder.id, folder.name, !!(folder.is_public || folder.username))}
                    onExportInvite={() => onExportInvite(folder.id, folder.name)}
                    folderId={folder.id}
                    isPublic={!!(folder.is_public || folder.username)}
                    collapsed={settings.sidebarCollapsed}
                    groups={groups}
                    onAssignFolderToGroup={onAssignFolderToGroup}
                    level={level}
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleFolderExpand(folder.id)}
                />
                {hasChildren && isExpanded && !settings.sidebarCollapsed && (
                    <div className="flex flex-col">
                        {children.map(child => renderFolderItem(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const rootFolders = filteredFolders.filter(f => !f.parent_id);

    return (
        <aside 
            className="flex shrink-0 flex-col border-e border-app-border-subtle bg-app-sidebar transition-[width] duration-200"
            style={{ width: settings.sidebarCollapsed ? quietMetrics.sidebarWidth.collapsed : quietMetrics.sidebarWidth.expanded }}
            onClick={e => e.stopPropagation()}
        >
            <div className={`desktop-chrome-row ${settings.sidebarCollapsed ? 'flex-col justify-center gap-px' : 'justify-between'}`}>
                <div className="flex items-center gap-2">
                    <img src="/logo.svg" className={settings.sidebarCollapsed ? 'h-[22px] w-[22px]' : 'h-6 w-6'} alt="Logo" />
                    {!settings.sidebarCollapsed && (
                        <span className="text-app-title font-semibold tracking-[-0.01em] text-app-text">{t('common.app_title')}</span>
                    )}
                </div>
                <button
                    onClick={() => updateSetting('sidebarCollapsed', !settings.sidebarCollapsed)}
                    className={`quiet-control flex items-center justify-center text-app-text-tertiary hover:text-app-text ${settings.sidebarCollapsed ? 'h-[15px] w-6' : 'h-7 w-7'}`}
                    title={settings.sidebarCollapsed ? t('common.expand_sidebar') || "Expand Sidebar" : t('common.collapse_sidebar') || "Collapse Sidebar"}
                >
                    {settings.sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>
            </div>

                {settings.sidebarCollapsed ? <div className="desktop-chrome-row" aria-hidden="true" /> : (
                    <div className="flex shrink-0 flex-col">
                        <div className="desktop-chrome-row justify-between">
                            <span className="text-ui font-medium text-app-text-tertiary">
                                {t('common.groups') || "Groups"}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => updateSetting('hideGroups', !settings.hideGroups)}
                                    className="quiet-control flex h-7 w-7 items-center justify-center text-app-text-tertiary hover:text-app-text"
                                    title={settings.hideGroups ? t('common.show_groups') || "Show Groups" : t('common.hide_groups') || "Hide Groups"}
                                >
                                    {settings.hideGroups ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {!settings.hideGroups && (
                                    <button
                                        onClick={() => {
                                            setEditingGroup(null);
                                            setGroupName("");
                                            setGroupColor("#3B82F6");
                                            setShowGroupEditor(true);
                                        }}
                                        className="quiet-control flex h-7 w-7 items-center justify-center text-app-text-tertiary hover:text-app-text"
                                        title={t('common.create_group') || "Create Group"}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {!settings.hideGroups && showGroupEditor && (
                            <div className="quiet-surface mx-3 mb-2.5 flex flex-col gap-2.5 p-2.5 animate-in fade-in duration-150">
                                <div>
                                    <label className="mb-1 block text-badge font-medium text-app-text-secondary">
                                        {editingGroup ? t('common.edit_group_name') : t('common.new_group_name')}
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="quiet-control h-8 w-full border border-app-border bg-app-surface-sunken/50 px-2 text-ui text-app-text outline-none"
                                        placeholder={t('common.enter_group_name')}
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-badge font-medium text-app-text-secondary">
                                        {t('common.theme_color')}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setGroupColor(color)}
                                                className={`w-5 h-5 rounded-full border transition-all ${
                                                    groupColor === color
                                                        ? 'border-white scale-110 shadow-md ring-1 ring-telegram-primary'
                                                        : 'border-transparent hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end mt-1">
                                    {editingGroup && (
                                        <button
                                            onClick={() => handleDeleteGroupClick(editingGroup.id)}
                                            className="mr-auto p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            title={t('common.delete_group')}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowGroupEditor(false);
                                            setEditingGroup(null);
                                        }}
                                        className="quiet-control flex h-7 items-center gap-1 px-2 text-badge font-medium text-app-text-secondary hover:text-app-text"
                                    >
                                        <X className="w-3 h-3" />
                                        {t('common.cancel') || "Cancel"}
                                    </button>
                                    <button
                                        onClick={handleSaveGroup}
                                        disabled={!groupName.trim()}
                                        className="quiet-control flex h-7 items-center gap-1 bg-app-accent px-2.5 text-badge font-medium text-app-accent-contrast hover:bg-app-accent-hover disabled:opacity-50"
                                    >
                                        <Check className="w-3 h-3" />
                                        {t('common.save') || "Save"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!settings.hideGroups && (
                            <div 
                                className="group-tabs-scroll flex items-center gap-2 overflow-x-auto px-3 pb-2.5 pt-2"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <style>{`
                                    .group-tabs-scroll::-webkit-scrollbar {
                                        display: none;
                                    }
                                `}</style>
                                <GroupTab
                                    id="group-tab-all"
                                    groupId="all"
                                    label={t('common.all') || "All"}
                                    active={activeGroupId === 'all'}
                                    onClick={() => setActiveGroupId('all')}
                                    isSortable={false}
                                />
                                <GroupTab
                                    id="group-tab-unassigned"
                                    groupId={null}
                                    label={t('common.unassigned') || "Unassigned"}
                                    active={activeGroupId === null}
                                    onClick={() => setActiveGroupId(null)}
                                    isSortable={false}
                                />
                                <SortableContext
                                    items={groups.map(g => `group-tab-${g.id}`)}
                                    strategy={horizontalListSortingStrategy}
                                >
                                    {groups.map(group => (
                                        <GroupTab
                                            key={group.id}
                                            id={`group-tab-${group.id}`}
                                            groupId={group.id}
                                            label={group.name}
                                            colorHex={group.color_hex}
                                            active={activeGroupId === group.id}
                                            onClick={() => setActiveGroupId(group.id)}
                                            onEdit={() => {
                                                setEditingGroup(group);
                                                setGroupName(group.name);
                                                setGroupColor(group.color_hex || "#3B82F6");
                                                setShowGroupEditor(true);
                                            }}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        )}
                    </div>
                )}

                {/* Scrollable folder list */}
                <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
                    {([
                        ['recents', Clock3, t('common.recents')],
                        ['favorites', Star, t('common.favorites')],
                        ['pinned', Pin, t('common.pinned')],
                        ['offline', Database, t('common.offline_files')],
                    ] as const).map(([view, Icon, label]) => (
                        <button
                            key={view}
                            type="button"
                            onClick={() => onSmartViewChange?.(view)}
                            title={label}
                            aria-current={activeSmartView === view ? 'page' : undefined}
                            className={`quiet-control flex h-8 w-full items-center ${settings.sidebarCollapsed ? 'justify-center' : 'gap-2 px-2.5'} text-ui font-medium ${activeSmartView === view ? 'bg-app-selected text-app-accent' : 'text-app-text-secondary hover:text-app-text'}`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!settings.sidebarCollapsed && <span>{label}</span>}
                        </button>
                    ))}
                    {!settings.sidebarCollapsed && <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-app-text-tertiary">{t('common.storage_insights')}</p>}
                    {([
                        ['large', FileWarning, t('common.large_files')],
                        ['old', CalendarClock, t('common.old_files')],
                        ['duplicates', Copy, t('common.duplicates')],
                    ] as const).map(([view, Icon, label]) => (
                        <button
                            key={view}
                            type="button"
                            onClick={() => onSmartViewChange?.(view)}
                            title={label}
                            aria-current={activeSmartView === view ? 'page' : undefined}
                            className={`quiet-control flex h-8 w-full items-center ${settings.sidebarCollapsed ? 'justify-center' : 'gap-2 px-2.5'} text-ui font-medium ${activeSmartView === view ? 'bg-app-selected text-app-accent' : 'text-app-text-secondary hover:text-app-text'}`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!settings.sidebarCollapsed && <span>{label}</span>}
                        </button>
                    ))}
                    {!settings.sidebarCollapsed && <div className="my-2 h-px bg-app-border-subtle" />}
                    <SidebarItem
                        icon={HardDrive}
                        label={t('common.saved_messages')}
                        active={activeFolderId === null && !activeSmartView}
                        onClick={() => { onSmartViewChange?.(null); setActiveFolderId(null); }}
                        folderId={null}
                        collapsed={settings.sidebarCollapsed}
                    />
                    <SortableContext
                        items={rootFolders.map(folder => `folder-${folder.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {rootFolders.map(folder => renderFolderItem(folder, 0))}
                    </SortableContext>
                </nav>
            {/* Sticky Create Folder section — always visible above the footer */}
            {!settings.sidebarCollapsed && (
                <div className="border-t border-app-border-subtle px-2 py-2">
                    <button
                        onClick={() => setShowNewFolderInput(true)}
                        className="quiet-control flex h-9 w-full items-center gap-2 border border-dashed border-app-border px-3 text-ui font-medium text-app-text-secondary hover:border-app-border-strong hover:text-app-text"
                    >
                        <Plus className="w-4 h-4" />
                        {t('common.create_folder')}
                    </button>
                </div>
            )}

            {showNewFolderInput && (
                <CreateFolderDialog onClose={() => setShowNewFolderInput(false)} onCreate={onCreate} />
            )}

            <div className={`flex flex-col border-t border-app-border-subtle p-2 ${settings.sidebarCollapsed ? 'items-center gap-2' : 'gap-2'}`}>
                {/* Profile Switcher (Bottom) */}
                {!settings.sidebarCollapsed && profiles && profiles.length > 0 && (
                    <div className="relative w-full">
                        <button
                            type="button"
                            onClick={() => setShowProfileSelector(!showProfileSelector)}
                            className="quiet-control flex w-full items-center justify-between border border-app-border-subtle bg-app-surface px-2.5 py-1.5 hover:bg-app-hover"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app-accent/15 text-app-accent">
                                    <User className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col items-start overflow-hidden text-left">
                                    <span className="truncate text-badge font-semibold text-app-text">
                                        {activeProfile || "Default Account"}
                                    </span>
                                    <span className="text-[10px] text-app-text-tertiary">{t('common.switch_account') || "Switch Account"}</span>
                                </div>
                            </div>
                            <ChevronDown className={`h-3.5 w-3.5 text-app-text-tertiary transition-transform ${showProfileSelector ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfileSelector && (
                            <div className="absolute bottom-full left-0 mb-1.5 w-full overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                <div className="max-h-48 overflow-y-auto p-1">
                                    <div className="border-b border-app-border-subtle px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-app-text-tertiary">
                                        {t('common.accounts') || "Accounts"}
                                    </div>
                                    {profiles.map((p: any) => (
                                        <div key={p.name} className="group/item flex items-center gap-1 px-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onSwitchProfile?.(p.name);
                                                    setShowProfileSelector(false);
                                                }}
                                                className={`flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-ui text-left transition-colors ${activeProfile === p.name ? 'bg-app-accent/15 font-medium text-app-accent' : 'text-app-text-secondary hover:bg-app-hover hover:text-app-text'}`}
                                            >
                                                <div className={`h-1.5 w-1.5 rounded-full ${activeProfile === p.name ? 'bg-app-accent' : 'bg-transparent'}`} />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                            {onDeleteProfile && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteProfile(p.name);
                                                    }}
                                                    className="opacity-0 group-hover/item:opacity-100 p-1 text-app-text-tertiary hover:text-app-danger transition-opacity rounded"
                                                    title="Delete Profile"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-app-border-subtle p-1 bg-app-sidebar">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleLogoutAction();
                                            setShowProfileSelector(false);
                                        }}
                                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-badge font-medium text-app-text hover:bg-app-accent hover:text-app-accent-contrast transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        {t('common.add_account') || "Add New Account"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <SyncStatusBadge collapsed={settings.sidebarCollapsed} />
                {settings.sidebarCollapsed ? (
                    <>
                        <div
                            className={`h-2 w-2 flex-shrink-0 rounded-full ${isConnected ? 'bg-app-success' : 'bg-app-danger'}`}
                            title={isConnected ? t('common.connected_telegram') : t('common.disconnected_telegram')}
                        />
                        <button
                            onClick={onSync}
                            disabled={isSyncing}
                            className={`quiet-control sidebar-sync-action p-2 text-app-accent ${isSyncing ? 'cursor-not-allowed opacity-50' : ''}`}
                            title={isSyncing ? t('common.syncing') : t('common.sync')}
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleLogoutAction}
                            className="quiet-control sidebar-logout-action p-2 text-app-danger"
                            title={t('common.logout')}
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 text-metadata text-app-text-secondary">
                            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-app-success' : 'bg-app-danger'}`}></div>
                            <span>{isConnected ? t('common.connected_telegram') : t('common.disconnected_telegram')}</span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onSync}
                                disabled={isSyncing}
                                className={`quiet-control sidebar-sync-action flex h-[30px] flex-1 items-center justify-center gap-1.5 px-2.5 text-badge font-medium text-app-accent ${isSyncing ? 'cursor-not-allowed opacity-50' : ''}`}
                                title="Scan for existing folders"
                            >
                                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? t('common.syncing') : t('common.sync')}
                            </button>
                            <button
                                onClick={handleLogoutAction}
                                className="quiet-control sidebar-logout-action flex h-[30px] flex-1 items-center justify-center gap-1.5 px-2.5 text-badge font-medium text-app-danger"
                                title="Sign Out"
                            >
                                <LogOut className="w-3 h-3" />
                                {t('common.logout')}
                            </button>
                        </div>

                        {bandwidth && <BandwidthWidget bandwidth={bandwidth} />}
                    </>
                )}
            </div>
        </aside>
    );
}
