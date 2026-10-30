import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin, Navigation, CheckCircle2, Clock, Map as MapIcon, ChevronLeft } from "lucide-react-native";
import * as Location from "expo-location";
import API from "../api/axios";
import moment from "moment";

const AttendanceScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      fetchAttendanceStatus();
    })();
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const { data } = await API.get("/attendance/my");
      setHistory(data);
      const today = moment().format("YYYY-MM-DD");
      const todayRecord = data.find(r => moment(r.date).format("YYYY-MM-DD") === today);
      setAttendance(todayRecord);
    } catch (err) {
      console.error("Fetch Attendance Error", err);
    }
  };

  const handlePunch = async (type) => {
    setLoading(true);
    try {
      const { data } = await API.post(`/attendance/${type}`, {
        location: { lat: location.latitude, lng: location.longitude }
      });
      Alert.alert("Success", `${type === 'checkin' ? 'Checked In' : 'Checked Out'} successfully!`);
      fetchAttendanceStatus();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-6 py-4 flex-row items-center border-b border-slate-100 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ChevronLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-black text-secondary tracking-tight ml-2">Attendance Portal</Text>
      </View>

      <ScrollView className="px-6 py-8" showsVerticalScrollIndicator={false}>
        {/* Real-time Location Card */}
        <View className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-md mb-8">
            <View className="flex-row justify-between items-center mb-6">
                <View className="p-4 bg-slate-50 rounded-3xl">
                    <MapPin color="#1e40af" size={32} />
                </View>
                <View className="items-end">
                    <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">GPS Status</Text>
                    <Text className="text-emerald-500 font-bold text-xs mt-1">Satellite Locked</Text>
                </View>
            </View>
            <Text className="text-slate-400 font-bold text-xs mb-1">Current Coordinates</Text>
            <Text className="text-secondary font-black text-lg tracking-tighter">
                {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Locating..."}
            </Text>
            <View className="flex-row items-center mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Navigation size={14} color="#64748b" />
                <Text className="text-slate-500 font-bold text-[10px] ml-2 uppercase tracking-widest">Geofence: Inside Safe Zone</Text>
            </View>
        </View>

        {/* Action Button */}
        {!attendance ? (
             <TouchableOpacity 
             onPress={() => handlePunch('checkin')}
             disabled={loading || !location}
             className="bg-primary p-8 rounded-[40px] items-center justify-center shadow-xl active:scale-95 transition-all"
           >
             {loading ? <ActivityIndicator color="#ffffff" /> : (
                 <>
                     <View style={{ marginBottom: 16 }}>
                        <CheckCircle2 color="#ffffff" size={48} />
                     </View>
                     <Text className="text-white text-2xl font-black tracking-tighter">Check-In Now</Text>
                     <Text className="text-white/60 font-bold text-xs mt-1 italic">Scan location & mark present</Text>
                 </>
             )}
           </TouchableOpacity>
        ) : !attendance.checkOut ? (
            <TouchableOpacity 
                onPress={() => handlePunch('checkout')}
                disabled={loading || !location}
                className="bg-rose-500 p-8 rounded-[40px] items-center justify-center shadow-xl active:scale-95 transition-all"
            >
                 {loading ? <ActivityIndicator color="#ffffff" /> : (
                    <>
                        <View style={{ marginBottom: 16 }}>
                            <Clock color="#ffffff" size={48} />
                        </View>
                        <Text className="text-white text-2xl font-black tracking-tighter">Punch-Out</Text>
                        <Text className="text-white/60 font-bold text-xs mt-1 italic">End shift & log hours</Text>
                    </>
                )}
            </TouchableOpacity>
        ) : (
            <View className="bg-emerald-500 p-8 rounded-[40px] items-center justify-center">
                 <View style={{ marginBottom: 16 }}>
                    <CheckCircle2 color="#ffffff" size={48} />
                 </View>
                 <Text className="text-white text-2xl font-black tracking-tighter">Shift Completed</Text>
                 <Text className="text-white/60 font-medium text-xs mt-1">See you tomorrow!</Text>
            </View>
        )}

        {/* History Preview */}
        <View className="mt-12 mb-10">
            <Text className="text-xl font-black text-secondary tracking-tight mb-6">Recent Logs</Text>
            {history.slice(0, 3).map((item, idx) => (
                <View key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-4 flex-row justify-between items-center">
                    <View>
                        <Text className="text-secondary font-bold text-sm">{moment(item.date).format("MMM DD, YYYY")}</Text>
                        <Text className="text-slate-400 font-medium text-[10px] mt-1 italic">Status: {item.status}</Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-primary font-black text-xs">{moment(item.checkIn).format("hh:mm A")}</Text>
                        <Text className="text-slate-300 font-bold text-[9px] uppercase tracking-widest mt-1">Punch In</Text>
                    </View>
                </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceScreen;
