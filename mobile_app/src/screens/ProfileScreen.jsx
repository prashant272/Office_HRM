import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  User, Mail, Phone, MapPin, 
  ChevronRight, Settings, ShieldCheck, 
  CreditCard, Info, LogOut
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (userInfo) setUser(JSON.parse(userInfo));
    })();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("userInfo");
          navigation.replace("Login");
        }
      }
    ]);
  };

  const ProfileItem = ({ icon: Icon, title, value, color = "#64748b" }) => (
    <TouchableOpacity className="flex-row items-center justify-between py-5 border-b border-slate-50">
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-2xl bg-slate-50 items-center justify-center mr-4">
          <Icon size={18} color={color} />
        </View>
        <View>
          <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</Text>
          <Text className="text-secondary font-bold text-sm mt-0.5">{value}</Text>
        </View>
      </View>
      <ChevronRight size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="items-center mt-6 mb-10">
          <View className="w-32 h-32 rounded-[48px] bg-primary items-center justify-center shadow-xl relative">
            <Text className="text-white text-5xl font-black">{user?.name?.[0]}</Text>
            <View className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white" />
          </View>
          <Text className="text-3xl font-black text-secondary tracking-tighter mt-6">{user?.name}</Text>
          <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 italic">{user?.role} • {user?.department?.name || 'Office'}</Text>
        </View>

        {/* Info Grid */}
        <View className="bg-slate-50/50 p-6 rounded-[40px] mb-8">
          <ProfileItem icon={Mail} title="Email Address" value={user?.email} />
          <ProfileItem icon={ShieldCheck} title="Employee ID" value={user?._id?.slice(-8).toUpperCase()} />
          <ProfileItem icon={MapPin} title="Home Branch" value="Main Office, Delhi" />
        </View>

        {/* Quick Menu */}
        <View className="mb-10 px-2">
            <Text className="text-xl font-black text-secondary tracking-tight mb-6">Management</Text>
            <ProfileItem icon={CreditCard} title="Payroll & Slips" value="Jan 2024 Generated" color="#3b82f6" />
            <ProfileItem icon={Settings} title="Security Settings" value="Change Password / 2FA" color="#64748b" />
            <ProfileItem icon={Info} title="Help & Support" value="Contact HR Service Desk" color="#64748b" />
        </View>

        <TouchableOpacity 
            onPress={handleLogout}
            className="bg-rose-50 p-6 rounded-3xl flex-row items-center justify-center mb-10"
        >
            <LogOut size={20} color="#f43f5e" />
            <Text className="text-rose-600 font-black uppercase tracking-widest text-xs ml-3">Terminate Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
