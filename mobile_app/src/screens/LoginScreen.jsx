import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock, Mail, ChevronRight, Fingerprint } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/axios";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return setError("Fill all fields");
    setLoading(true);
    setError("");
    try {
      const { data } = await API.post("/auth/login", { email, password });
      await AsyncStorage.setItem("userInfo", JSON.stringify(data));
      // Navigate to Dashboard (once setup)
      navigation.replace("Main"); 
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 px-8 justify-center">
        <View className="mb-12">
            <View className="w-20 h-20 bg-primary rounded-3xl items-center justify-center mb-6 shadow-xl">
                <Lock color="#ffffff" size={40} />
            </View>
          <Text className="text-4xl font-extrabold text-secondary tracking-tighter">Welcome back</Text>
          <Text className="text-slate-400 font-medium mt-2">Sign in to your workplace portal</Text>
        </View>

        <View className="space-y-6">
          <View className="space-y-2">
            <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email Address</Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 focus:border-primary">
              <Mail size={18} color="#64748b" />
              <TextInput
                className="flex-1 ml-3 font-bold text-secondary text-sm"
                placeholder="office@prime.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="space-y-2 mt-4">
            <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Secure Password</Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4">
              <Lock size={18} color="#64748b" />
              <TextInput
                className="flex-1 ml-3 font-bold text-secondary text-sm"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {error ? <Text className="text-rose-500 text-xs font-bold mt-2 ml-1">{error}</Text> : null}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-primary py-5 rounded-2xl mt-8 flex-row items-center justify-center shadow-xl"
          >
            {loading ? <ActivityIndicator color="white" /> : (
                <>
                    <Text className="text-white font-black uppercase tracking-widest text-sm">Authenticate</Text>
                    <View style={{ marginLeft: 8 }}>
                        <ChevronRight size={18} color="white" />
                    </View>
                </>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-center mt-10 space-x-2 opacity-60">
             <Fingerprint size={20} color="#1e293b" />
             <Text className="text-secondary font-bold text-xs">Login with Biometrics</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-auto items-center pb-8">
            <Text className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Office Management System v1.0</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
