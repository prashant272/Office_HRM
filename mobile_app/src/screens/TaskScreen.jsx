import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  CheckCircle2, Clock, Calendar, 
  ChevronRight, ListTodo, Plus, 
  Flame, Target, AlertCircle
} from "lucide-react-native";
import API from "../api/axios";
import moment from "moment";

const TaskScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await API.get("/tasks");
      setTasks(data);
    } catch (err) {
      console.log("Task fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const TaskCard = ({ task }) => {
    const isOverdue = moment().isAfter(moment(task.deadline)) && task.status !== "Completed";
    
    return (
        <View className="bg-white p-6 rounded-[24px] border border-slate-100 mb-4 shadow-md">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-row items-center">
                    <View className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-rose-500' : 'bg-blue-500'} mr-2`} />
                    <Text className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{task.priority} Priority</Text>
                </View>
                <View className={`px-2 py-0.5 rounded-lg ${task.status === 'Completed' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <Text className={`font-black text-[9px] uppercase tracking-widest ${task.status === 'Completed' ? 'text-emerald-600' : 'text-slate-500'}`}>{task.status}</Text>
                </View>
            </View>
            
            <Text className="text-lg font-black text-secondary tracking-tight mb-2">{task.title}</Text>
            <Text className="text-slate-400 text-xs font-medium mb-6 line-clamp-2">{task.description}</Text>
            
            <View className="flex-row items-center justify-between pt-4 border-t border-slate-50">
                <View className="flex-row items-center">
                    <Clock size={12} color={isOverdue ? "#f43f5e" : "#64748b"} />
                    <Text className={`text-[10px] font-bold ml-2 ${isOverdue ? 'text-rose-500' : 'text-slate-500'}`}>
                        {moment(task.deadline).format("MMM DD")}
                    </Text>
                </View>
                {task.status !== 'Completed' && (
                    <TouchableOpacity className="bg-slate-50 px-4 py-2 rounded-xl">
                        <Text className="text-primary font-black text-[10px] uppercase tracking-widest">Mark Done</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100 bg-white">
        <Text className="text-xl font-black text-secondary tracking-tight">Active Missions</Text>
        <TouchableOpacity className="p-2 bg-slate-50 rounded-xl">
            <Plus color="#1e40af" size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
          <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#1e40af" />
          </View>
      ) : (
          <ScrollView className="px-6 py-8" showsVerticalScrollIndicator={false}>
              {/* Quick Summary */}
              <View className="flex-row mb-8">
                  <View className="flex-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-md mr-4 items-center">
                      <Target color="#3b82f6" size={24} />
                      <Text className="text-2xl font-black text-secondary mt-2">{tasks.filter(t => t.status !== 'Completed').length}</Text>
                      <Text className="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center mt-1">Pending</Text>
                  </View>
                  <View className="flex-1 bg-white p-6 rounded-[32px] border border-slate-100 shadow-md items-center">
                      <Flame color="#f43f5e" size={24} />
                      <Text className="text-2xl font-black text-secondary mt-2">{tasks.filter(t => t.priority === 'High').length}</Text>
                      <Text className="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center mt-1">Critical</Text>
                  </View>
              </View>

              {tasks.length === 0 ? (
                  <View className="mt-20 items-center opacity-30">
                      <ListTodo size={64} color="#64748b" />
                      <Text className="text-secondary font-black text-lg mt-4">All Missions Cleared</Text>
                      <Text className="text-slate-400 font-bold text-xs">You're all caught up!</Text>
                  </View>
              ) : (
                  tasks.map((task) => <TaskCard key={task._id} task={task} />)
              )}
              <View className="h-20" />
          </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default TaskScreen;
