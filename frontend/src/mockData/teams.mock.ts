import { Team } from '../types/auth';

export const MOCK_TEAMS: Team[] = [
  { id: 'team-01', teamName: 'AquaPulse Robotics', college: 'Tech Institute of Technology', leaderName: 'Aarav Sharma', membersCount: 4, qualifiedRound1: true, tableNumber: 1 },
  { id: 'team-02', teamName: 'HydroVortex Innovators', college: 'National Engineering College', leaderName: 'Priya Patel', membersCount: 4, qualifiedRound1: true, tableNumber: 2 },
  { id: 'team-03', teamName: 'Submersible Titans', college: 'Apex Institute of Science', leaderName: 'Rohan Verma', membersCount: 3, qualifiedRound1: true, tableNumber: 3 },
  { id: 'team-04', teamName: 'NauticalBytes Lab', college: 'Metropolitan University', leaderName: 'Ananya Sen', membersCount: 4, qualifiedRound1: true, tableNumber: 4 },
  { id: 'team-05', teamName: 'WaveRiders Crew', college: 'Federal Tech Academy', leaderName: 'Kabir Mehta', membersCount: 4, qualifiedRound1: true, tableNumber: 5 },
  { id: 'team-06', teamName: 'Oceanic Circuit Masters', college: 'Institute of Marine Tech', leaderName: 'Tanvi Nair', membersCount: 3, qualifiedRound1: true, tableNumber: 6 },
  { id: 'team-07', teamName: 'Rudder Dynamics', college: 'State Engineering College', leaderName: 'Vikram Rao', membersCount: 4, qualifiedRound1: true, tableNumber: 7 },
  { id: 'team-08', teamName: 'DeepBlue Builders', college: 'Coastal University', leaderName: 'Sneha Kulkarni', membersCount: 4, qualifiedRound1: true, tableNumber: 8 },
  { id: 'team-09', teamName: 'Buoyancy Pioneers', college: 'National Institute of Tech', leaderName: 'Aditya Joshi', membersCount: 3, qualifiedRound1: false, tableNumber: 9 },
  { id: 'team-10', teamName: 'Propeller Surge', college: 'Global Tech University', leaderName: 'Devika Menon', membersCount: 4, qualifiedRound1: false, tableNumber: 10 },
];

export const MOCK_CURRENT_TEAM: Team = MOCK_TEAMS[0]; // AquaPulse Robotics default logged in team
