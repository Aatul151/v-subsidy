import { ComponentType } from 'react';
import { SearchableSelectOption } from '@/components/common/AppSearchableSelect';

// Admin Panel Icons
import Dashboard from '@mui/icons-material/Dashboard';
import Settings from '@mui/icons-material/Settings';
import Security from '@mui/icons-material/Security';
import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import SupervisedUserCircle from '@mui/icons-material/SupervisedUserCircle';
import People from '@mui/icons-material/People';
import Person from '@mui/icons-material/Person';
import Group from '@mui/icons-material/Group';
import PersonAdd from '@mui/icons-material/PersonAdd';
import PersonRemove from '@mui/icons-material/PersonRemove';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Lock from '@mui/icons-material/Lock';
import Key from '@mui/icons-material/Key';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Shield from '@mui/icons-material/Shield';

// CRM Icons
import Business from '@mui/icons-material/Business';
import BusinessCenter from '@mui/icons-material/BusinessCenter';
import CorporateFare from '@mui/icons-material/CorporateFare';
import ContactMail from '@mui/icons-material/ContactMail';
import ContactPhone from '@mui/icons-material/ContactPhone';
import Contacts from '@mui/icons-material/Contacts';
import Handshake from '@mui/icons-material/Handshake';
import TrendingUp from '@mui/icons-material/TrendingUp';
import AttachMoney from '@mui/icons-material/AttachMoney';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Payment from '@mui/icons-material/Payment';
import Receipt from '@mui/icons-material/Receipt';
import Inventory from '@mui/icons-material/Inventory';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import Store from '@mui/icons-material/Store';
import LocalShipping from '@mui/icons-material/LocalShipping';
import Assignment from '@mui/icons-material/Assignment';
import Task from '@mui/icons-material/Task';
import CheckCircle from '@mui/icons-material/CheckCircle';
import PendingActions from '@mui/icons-material/PendingActions';

// Communication Icons
import Email from '@mui/icons-material/Email';
import Phone from '@mui/icons-material/Phone';
import Message from '@mui/icons-material/Message';
import Chat from '@mui/icons-material/Chat';
import Notifications from '@mui/icons-material/Notifications';
import NotificationsActive from '@mui/icons-material/NotificationsActive';
import NotificationsOff from '@mui/icons-material/NotificationsOff';
import MailOutline from '@mui/icons-material/MailOutline';
import PhoneEnabled from '@mui/icons-material/PhoneEnabled';
import Sms from '@mui/icons-material/Sms';
import VideoCall from '@mui/icons-material/VideoCall';

// Calendar & Time Icons
import CalendarToday from '@mui/icons-material/CalendarToday';
import Event from '@mui/icons-material/Event';
import Schedule from '@mui/icons-material/Schedule';
import AccessTime from '@mui/icons-material/AccessTime';
import Today from '@mui/icons-material/Today';
import DateRange from '@mui/icons-material/DateRange';
import History from '@mui/icons-material/History';

// Data & Analytics Icons
import BarChart from '@mui/icons-material/BarChart';
import PieChart from '@mui/icons-material/PieChart';
import ShowChart from '@mui/icons-material/ShowChart';
import TrendingDown from '@mui/icons-material/TrendingDown';
import Assessment from '@mui/icons-material/Assessment';
import Analytics from '@mui/icons-material/Analytics';
import TableChart from '@mui/icons-material/TableChart';
import InsertChart from '@mui/icons-material/InsertChart';
import DonutLarge from '@mui/icons-material/DonutLarge';
import MultilineChart from '@mui/icons-material/MultilineChart';

// Content & Files Icons
import Description from '@mui/icons-material/Description';
import Folder from '@mui/icons-material/Folder';
import FolderOpen from '@mui/icons-material/FolderOpen';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';
import Image from '@mui/icons-material/Image';
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
import VideoLibrary from '@mui/icons-material/VideoLibrary';
import AttachFile from '@mui/icons-material/AttachFile';
import CloudUpload from '@mui/icons-material/CloudUpload';
import CloudDownload from '@mui/icons-material/CloudDownload';
import Article from '@mui/icons-material/Article';
import Note from '@mui/icons-material/Note';
import NoteAdd from '@mui/icons-material/NoteAdd';
import Book from '@mui/icons-material/Book';
import LibraryBooks from '@mui/icons-material/LibraryBooks';

// Navigation & Actions Icons
import Home from '@mui/icons-material/Home';
import Search from '@mui/icons-material/Search';
import Add from '@mui/icons-material/Add';
import AddCircle from '@mui/icons-material/AddCircle';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import DeleteForever from '@mui/icons-material/DeleteForever';
import Save from '@mui/icons-material/Save';
import Cancel from '@mui/icons-material/Cancel';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import Refresh from '@mui/icons-material/Refresh';
import FilterList from '@mui/icons-material/FilterList';
import Sort from '@mui/icons-material/Sort';
import MoreVert from '@mui/icons-material/MoreVert';
import MoreHoriz from '@mui/icons-material/MoreHoriz';
import Menu from '@mui/icons-material/Menu';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ArrowForward from '@mui/icons-material/ArrowForward';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Print from '@mui/icons-material/Print';
import Download from '@mui/icons-material/Download';
import Upload from '@mui/icons-material/Upload';
import Share from '@mui/icons-material/Share';
import Link from '@mui/icons-material/Link';
import CopyAll from '@mui/icons-material/CopyAll';
import ContentCopy from '@mui/icons-material/ContentCopy';

// Status & Feedback Icons
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import Error from '@mui/icons-material/Error';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import Warning from '@mui/icons-material/Warning';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Info from '@mui/icons-material/Info';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import HelpOutline from '@mui/icons-material/HelpOutline';
import Help from '@mui/icons-material/Help';
import QuestionMark from '@mui/icons-material/QuestionMark';
import Done from '@mui/icons-material/Done';
import DoneAll from '@mui/icons-material/DoneAll';
import Pending from '@mui/icons-material/Pending';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';

// Location & Map Icons
import LocationOn from '@mui/icons-material/LocationOn';
import LocationOff from '@mui/icons-material/LocationOff';
import Map from '@mui/icons-material/Map';
import Place from '@mui/icons-material/Place';
import Public from '@mui/icons-material/Public';
import Language from '@mui/icons-material/Language';

// System & Configuration Icons
import Build from '@mui/icons-material/Build';
import BuildCircle from '@mui/icons-material/BuildCircle';
import Tune from '@mui/icons-material/Tune';
import Storage from '@mui/icons-material/Storage';
import Cloud from '@mui/icons-material/Cloud';
import CloudQueue from '@mui/icons-material/CloudQueue';
import Dns from '@mui/icons-material/Dns';
import Router from '@mui/icons-material/Router';
import Computer from '@mui/icons-material/Computer';
import Devices from '@mui/icons-material/Devices';
import Smartphone from '@mui/icons-material/Smartphone';
import Tablet from '@mui/icons-material/Tablet';
import Laptop from '@mui/icons-material/Laptop';

// Work & Organization Icons
import Work from '@mui/icons-material/Work';
import WorkOutline from '@mui/icons-material/WorkOutline';
import School from '@mui/icons-material/School';
import Apartment from '@mui/icons-material/Apartment';
import Domain from '@mui/icons-material/Domain';
import Storefront from '@mui/icons-material/Storefront';

// School Management Icons
import Class from '@mui/icons-material/Class';
import Groups from '@mui/icons-material/Groups';
import PersonOutline from '@mui/icons-material/PersonOutline';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import Face from '@mui/icons-material/Face';
import EmojiPeople from '@mui/icons-material/EmojiPeople';
import ChildCare from '@mui/icons-material/ChildCare';
import MenuBook from '@mui/icons-material/MenuBook';
import AutoStories from '@mui/icons-material/AutoStories';
import BookOnline from '@mui/icons-material/BookOnline';
import ImportContacts from '@mui/icons-material/ImportContacts';
import Subject from '@mui/icons-material/Subject';
import Science from '@mui/icons-material/Science';
import Calculate from '@mui/icons-material/Calculate';
import Functions from '@mui/icons-material/Functions';
import Psychology from '@mui/icons-material/Psychology';
import HistoryEdu from '@mui/icons-material/HistoryEdu';
import LanguageIcon from '@mui/icons-material/Language';
import Palette from '@mui/icons-material/Palette';
import MusicNote from '@mui/icons-material/MusicNote';
import SportsSoccer from '@mui/icons-material/SportsSoccer';
import FitnessCenter from '@mui/icons-material/FitnessCenter';
import Code from '@mui/icons-material/Code';
import Quiz from '@mui/icons-material/Quiz';
import Grading from '@mui/icons-material/Grading';
import Grade from '@mui/icons-material/Grade';
import Stars from '@mui/icons-material/Stars';
import Star from '@mui/icons-material/Star';
import StarBorder from '@mui/icons-material/StarBorder';
import StarHalf from '@mui/icons-material/StarHalf';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import WorkspacePremium from '@mui/icons-material/WorkspacePremium';
import MilitaryTech from '@mui/icons-material/MilitaryTech';
import HowToReg from '@mui/icons-material/HowToReg';
import PersonPin from '@mui/icons-material/PersonPin';
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver';
import Mic from '@mui/icons-material/Mic';
import Videocam from '@mui/icons-material/Videocam';
import CastForEducation from '@mui/icons-material/CastForEducation';
import PlayCircle from '@mui/icons-material/PlayCircle';
import Timer from '@mui/icons-material/Timer';
import AccessAlarm from '@mui/icons-material/AccessAlarm';
import EventAvailable from '@mui/icons-material/EventAvailable';
import EventBusy from '@mui/icons-material/EventBusy';
import EventNote from '@mui/icons-material/EventNote';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import CalendarViewDay from '@mui/icons-material/CalendarViewDay';
import CalendarViewWeek from '@mui/icons-material/CalendarViewWeek';
import CalendarViewMonth from '@mui/icons-material/CalendarViewMonth';
import TableView from '@mui/icons-material/TableView';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLong from '@mui/icons-material/ReceiptLong';
import CreditCard from '@mui/icons-material/CreditCard';
import LocalAtm from '@mui/icons-material/LocalAtm';
import AccountTree from '@mui/icons-material/AccountTree';
import FamilyRestroom from '@mui/icons-material/FamilyRestroom';
import Diversity3 from '@mui/icons-material/Diversity3';
import Badge from '@mui/icons-material/Badge';
import CardMembership from '@mui/icons-material/CardMembership';
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ClassOutlined from '@mui/icons-material/ClassOutlined';

export const ICON_MAP: Record<string, ComponentType<any>> = {
  // Admin Panel
  Dashboard,
  Settings,
  Security,
  AdminPanelSettings,
  SupervisedUserCircle,
  People,
  Person,
  Group,
  PersonAdd,
  PersonRemove,
  AccountCircle,
  Lock,
  Key,
  VerifiedUser,
  Shield,

  // CRM
  Business,
  BusinessCenter,
  CorporateFare,
  ContactMail,
  ContactPhone,
  Contacts,
  Handshake,
  TrendingUp,
  AttachMoney,
  AccountBalance,
  Payment,
  Receipt,
  Inventory,
  ShoppingCart,
  Store,
  LocalShipping,
  Assignment,
  Task,
  CheckCircle,
  PendingActions,

  // Communication
  Email,
  Phone,
  Message,
  Chat,
  Notifications,
  NotificationsActive,
  NotificationsOff,
  MailOutline,
  PhoneEnabled,
  Sms,
  VideoCall,

  // Calendar & Time
  CalendarToday,
  Event,
  Schedule,
  AccessTime,
  Today,
  DateRange,
  History,

  // Data & Analytics
  BarChart,
  PieChart,
  ShowChart,
  TrendingDown,
  Assessment,
  Analytics,
  TableChart,
  InsertChart,
  DonutLarge,
  MultilineChart,

  // Content & Files
  Description,
  Folder,
  FolderOpen,
  InsertDriveFile,
  Image,
  PictureAsPdf,
  VideoLibrary,
  AttachFile,
  CloudUpload,
  CloudDownload,
  Article,
  Note,
  NoteAdd,
  Book,
  LibraryBooks,

  // Navigation & Actions
  Home,
  Search,
  Add,
  AddCircle,
  Edit,
  Delete,
  DeleteForever,
  Save,
  Cancel,
  Check,
  Close,
  Refresh,
  FilterList,
  Sort,
  MoreVert,
  MoreHoriz,
  Menu,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  Visibility,
  VisibilityOff,
  Print,
  Download,
  Upload,
  Share,
  Link,
  CopyAll,
  ContentCopy,

  // Status & Feedback
  CheckCircleOutline,
  Error,
  ErrorOutline,
  Warning,
  WarningAmber,
  Info,
  InfoOutlined,
  HelpOutline,
  Help,
  QuestionMark,
  Done,
  DoneAll,
  Pending,
  HourglassEmpty,

  // Location & Map
  LocationOn,
  LocationOff,
  Map,
  Place,
  Public,
  Language,

  // System & Configuration
  Build,
  BuildCircle,
  Tune,
  Storage,
  Cloud,
  CloudQueue,
  Dns,
  Router,
  Computer,
  Devices,
  Smartphone,
  Tablet,
  Laptop,

  // Work & Organization
  Work,
  WorkOutline,
  School,
  Apartment,
  Domain,
  Storefront,

  // School Management
  Class,
  Groups,
  PersonOutline,
  PersonAddAlt,
  Face,
  EmojiPeople,
  ChildCare,
  MenuBook,
  AutoStories,
  BookOnline,
  ImportContacts,
  Subject,
  Science,
  Calculate,
  Functions,
  Psychology,
  HistoryEdu,
  LanguageIcon,
  Palette,
  MusicNote,
  SportsSoccer,
  FitnessCenter,
  Code,
  Quiz,
  Grading,
  Grade,
  Stars,
  Star,
  StarBorder,
  StarHalf,
  EmojiEvents,
  WorkspacePremium,
  MilitaryTech,
  HowToReg,
  PersonPin,
  RecordVoiceOver,
  Mic,
  Videocam,
  CastForEducation,
  PlayCircle,
  Timer,
  AccessAlarm,
  EventAvailable,
  EventBusy,
  EventNote,
  CalendarMonth,
  CalendarViewDay,
  CalendarViewWeek,
  CalendarViewMonth,
  TableView,
  AccountBalanceWallet,
  ReceiptLong,
  CreditCard,
  LocalAtm,
  AccountTree,
  FamilyRestroom,
  Diversity3,
  Badge,
  CardMembership,
  WorkspacePremiumOutlined,
  SchoolOutlined,
  ClassOutlined,
};

/**
 * Get icon component from the icon map by name
 * @param iconName - Icon name (e.g., "Description", "Settings", "DescriptionIcon")
 * @returns Icon component or null if not found
 */
export const getIconFromMap = (iconName: string | undefined): ComponentType<any> | null => {
  if (!iconName) return null;

  // Normalize icon name - remove "Icon" suffix if present
  let normalizedName = iconName.trim();
  if (normalizedName.endsWith('Icon')) {
    normalizedName = normalizedName.slice(0, -4); // Remove "Icon"
  }

  // Try exact match first
  if (ICON_MAP[normalizedName]) {
    return ICON_MAP[normalizedName];
  }

  // Try with original name (in case it's already normalized)
  if (ICON_MAP[iconName]) {
    return ICON_MAP[iconName];
  }

  return null;
};

/**
 * Icon categories for grouping in dropdowns
 */
const ICON_CATEGORIES: Record<string, string[]> = {
  'Admin Panel': [
    'Dashboard', 'Settings', 'Security', 'AdminPanelSettings', 'SupervisedUserCircle',
    'People', 'Person', 'Group', 'PersonAdd', 'PersonRemove', 'AccountCircle',
    'Lock', 'Key', 'VerifiedUser', 'Shield',
  ],
  'CRM': [
    'Business', 'BusinessCenter', 'CorporateFare', 'ContactMail', 'ContactPhone',
    'Contacts', 'Handshake', 'TrendingUp', 'AttachMoney', 'AccountBalance',
    'Payment', 'Receipt', 'Inventory', 'ShoppingCart', 'Store', 'LocalShipping',
    'Assignment', 'Task', 'CheckCircle', 'PendingActions',
  ],
  'Communication': [
    'Email', 'Phone', 'Message', 'Chat', 'Notifications', 'NotificationsActive',
    'NotificationsOff', 'MailOutline', 'PhoneEnabled', 'Sms', 'VideoCall',
  ],
  'Calendar & Time': [
    'CalendarToday', 'Event', 'Schedule', 'AccessTime', 'Today', 'DateRange', 'History',
  ],
  'Data & Analytics': [
    'BarChart', 'PieChart', 'ShowChart', 'TrendingDown', 'Assessment', 'Analytics',
    'TableChart', 'InsertChart', 'DonutLarge', 'MultilineChart',
  ],
  'Content & Files': [
    'Description', 'Folder', 'FolderOpen', 'InsertDriveFile', 'Image', 'PictureAsPdf',
    'VideoLibrary', 'AttachFile', 'CloudUpload', 'CloudDownload', 'Article', 'Note',
    'NoteAdd', 'Book', 'LibraryBooks',
  ],
  'Navigation & Actions': [
    'Home', 'Search', 'Add', 'AddCircle', 'Edit', 'Delete', 'DeleteForever', 'Save',
    'Cancel', 'Check', 'Close', 'Refresh', 'FilterList', 'Sort', 'MoreVert', 'MoreHoriz',
    'Menu', 'ArrowBack', 'ArrowForward', 'ExpandMore', 'ExpandLess', 'Visibility',
    'VisibilityOff', 'Print', 'Download', 'Upload', 'Share', 'Link', 'CopyAll', 'ContentCopy',
  ],
  'Status & Feedback': [
    'CheckCircleOutline', 'Error', 'ErrorOutline', 'Warning', 'WarningAmber', 'Info',
    'InfoOutlined', 'HelpOutline', 'Help', 'QuestionMark', 'Done', 'DoneAll', 'Pending',
    'HourglassEmpty',
  ],
  'Location & Map': [
    'LocationOn', 'LocationOff', 'Map', 'Place', 'Public', 'Language',
  ],
  'System & Configuration': [
    'Build', 'BuildCircle', 'Tune', 'Storage', 'Cloud', 'CloudQueue', 'Dns', 'Router',
    'Computer', 'Devices', 'Smartphone', 'Tablet', 'Laptop',
  ],
  'Work & Organization': [
    'Work', 'WorkOutline', 'School', 'Apartment', 'Domain', 'Storefront',
  ],
  'School Management': [
    'Class', 'ClassOutlined', 'Groups', 'PersonOutline', 'PersonAddAlt',
    'Face', 'EmojiPeople', 'ChildCare', 'MenuBook', 'AutoStories', 'BookOnline',
    'ImportContacts', 'Subject', 'Science', 'Calculate', 'Functions', 'Psychology',
    'HistoryEdu', 'LanguageIcon', 'Palette', 'MusicNote', 'SportsSoccer', 'FitnessCenter',
    'Code', 'Quiz', 'Grading', 'Grade', 'Stars', 'Star', 'StarBorder', 'StarHalf',
    'EmojiEvents', 'WorkspacePremium', 'WorkspacePremiumOutlined', 'MilitaryTech',
    'HowToReg', 'PersonPin', 'RecordVoiceOver', 'Mic', 'Videocam', 'CastForEducation',
    'PlayCircle', 'Timer', 'AccessAlarm', 'EventAvailable', 'EventBusy', 'EventNote',
    'CalendarMonth', 'CalendarViewDay', 'CalendarViewWeek', 'CalendarViewMonth',
    'TableView', 'AccountBalanceWallet', 'ReceiptLong', 'CreditCard', 'LocalAtm',
    'AccountTree', 'FamilyRestroom', 'Diversity3', 'Badge', 'CardMembership',
    'SchoolOutlined',
  ],
};

/**
 * Get icon category for a given icon name
 */
const getIconCategory = (iconName: string): string | undefined => {
  for (const [category, icons] of Object.entries(ICON_CATEGORIES)) {
    if (icons.includes(iconName)) {
      return category;
    }
  }
  return undefined;
};

/**
 * Convert ICON_MAP to SearchableSelectOption array with groups
 * @returns Array of SearchableSelectOption with grouped icons
 */
export const getIconSelectOptions = (): SearchableSelectOption[] => {
  return Object.entries(ICON_MAP).map(([iconName, IconComponent]) => ({
    value: iconName,
    label: iconName,
    icon: IconComponent,
    group: getIconCategory(iconName),
  }));
};

