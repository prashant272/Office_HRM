import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  CheckCircle, Calendar, 
  TrendingUp, Briefcase, Activity, BellRing, 
  LogOut
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/axios";

const StatCard = ({ title, value, icon: Icon, color, hex, trend }) => (
  <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mr-4 mb-4 flex-1">
    <View className="flex-row justify-between mb-4">
      <View className={`p-3 rounded-2xl ${color}`}>
        <Icon color={hex} size={20} />
      </View>
      {trend && (
        <View className="bg-emerald-50 px-2 py-0.5 rounded-lg flex-row items-center">
          <TrendingUp size={10} color="#10b981" />
          <Text className="text-emerald-600 font-bold text-[10px] ml-1">{trend}</Text>
        </View>
      )}
    </View>
    <Text className="text-slate-400 font-black uppercase text-[10px] tracking-widest">{title}</Text>
    <Text className="text-2xl font-black text-secondary tracking-tighter mt-1">{value}</Text>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (userInfo) setUser(JSON.parse(userInfo));
      try {
        const { data } = await API.get("/dashboard/stats");
        setStats(data);
      } catch (err) {
        console.error("Dashboard Fetch Error", err);
      }
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userInfo");
    navigation.replace("Login");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-10">
          <View>
            <Text className="text-3xl font-black text-secondary tracking-tighter">Office</Text>
            <View className="flex-row items-center mt-1">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              <Text className="text-slate-400 font-bold italic text-xs">Active Workspace</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} className="w-12 h-12 bg-white rounded-2xl items-center justify-center border border-slate-100 shadow-sm">
            <LogOut size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View className="bg-primary p-8 rounded-[40px] shadow-xl mb-8 relative overflow-hidden">
            <View className="relative z-10">
                <Text className="text-white/80 font-black uppercase tracking-widest text-[10px] mb-2">Authenticated as</Text>
                <Text className="text-white text-4xl font-black tracking-tighter">{user?.name?.split(' ')[0]}</Text>
                <Text className="text-white/90 font-bold mt-2 italic">{user?.role} • {user?.department?.name || 'Department'}</Text>
            </View>
            <View style={{ position: 'absolute', right: -80, bottom: -80, transform: [{ rotate: '12deg' }], opacity: 0.1 }}>
                <Activity color="#ffffff" size={200} />
            </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row mb-10">
            <TouchableOpacity onPress={() => navigation.navigate("Attendance")} className="flex-1 bg-white p-6 rounded-3xl border border-slate-100 flex-row items-center space-x-4 shadow-sm mr-4">
                <Calendar color="#1e40af" size={24} />
                <View>
                    <Text className="text-secondary font-black text-xs uppercase tracking-widest">Attendance</Text>
                    <Text className="text-slate-400 font-bold text-[10px]">9:03 AM Login</Text>
                </View>
            </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View className="flex-row flex-wrap">
          <StatCard title="Tasks" value={stats?.myPendingTasks || 0} icon={Briefcase} color="bg-orange-500" hex="#f97316" trend="+2" />
          <StatCard title="Resolved" value={stats?.myCompletedTasks || 0} icon={CheckCircle} color="bg-emerald-500" hex="#10b981" trend="100%" />
        </View>

        {/* Announcements Section */}
        <View className="mb-10">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-black text-secondary tracking-tight">Recent Broadcasts</Text>
                <BellRing size={20} color="#94a3b8" />
            </View>
            <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                <View className="flex-row items-center mb-3">
                    <View className="px-2 py-0.5 bg-rose-100 rounded-lg">
                        <Text className="text-rose-600 font-black text-[9px] uppercase tracking-widest">Urgent</Text>
                    </View>
                    <Text className="text-secondary font-bold text-xs ml-3">System Maintenance tonight @ 10 PM</Text>
                </View>
                <Text className="text-slate-400 text-xs font-medium leading-5">The main server will be undergoing routine updates. Please save your work before logging off.</Text>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;
