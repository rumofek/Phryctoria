import "react-native-gesture-handler";
// import { setStatusBarNetworkActivityIndicatorVisible, StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {

  AppRegistry,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  NativeModules,
  PermissionsAndroid,
  NativeEventEmitter,
  Alert,
} from "react-native";
import {
  VictoryScatter,
  VictoryChart,
  VictoryLabel,
  VictoryGroup,
} from "victory-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ScrollView, TextInput } from "react-native-gesture-handler";
import axios from "axios";

import BleManager from 'react-native-ble-manager';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);



const Stack = createNativeStackNavigator();

const serverUrl = "http://10.0.0.201:4000/";

let org = "test";
let email = "testymctestfacejr@gmail.com";
let clockedIn = false;



export default function App() {
  const [isScanning, setIsScanning] = useState(false);

  const startScan = () => {
    if (!isScanning) {
      BleManager.scan([], 10, true).then((results) => {
        console.log('Scanning...');
        setIsScanning(true);
      }).catch(err => {
        console.error(err);
      });
    }
  }

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
  }

  const handleDiscoverPeripheral = (peripheral) => {
    console.log('Got ble peripheral', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    peripherals.set(peripheral.id, peripheral);
    setList(Array.from(peripherals.values()));
  }


  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Log In"
          component={LogInPage}
          options={{ headerStyle: { backgroundColor: "#E6D1F2" } }}
        />

        <Stack.Screen
          name="Sign Up"
          component={SignUpPage}
          options={{ headerStyle: { backgroundColor: "#E6D1F2" } }}
        />

        <Stack.Screen
          name="Home"
          component={MainPage}
          options={{ headerStyle: { backgroundColor: "#CCB7E5" } }}
        />

        <Stack.Screen
          name="Notifications"
          component={NotificationPage}
          options={{ headerStyle: { backgroundColor: "#BEA9DF" } }}
        />

        <Stack.Screen
          name="Report Exposure"
          component={ReportPositivePage}
          options={{ headerStyle: { backgroundColor: "#D00000" } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


const LogInPage = ({ navigation }) => {
  let [pass, setPass] = useState("password");
  return (
    <View style={styles.container}>
      <TextInput style={styles.Input} defaultValue="test" placeholder="Organization" onChangeText={input => org = input} />
      <TextInput style={styles.Input} defaultValue="testymctestfacejr@gmail.com" placeholder="Email" onChangeText={input => email = input} />
      <TextInput style={styles.Input} defaultValue="password" placeholder="Password" onChangeText={input => setPass(input)} />

      <TouchableOpacity
        style={styles.MainButtonStyle}
        activeOpacity={0.5}
        onPress={() => {
          axios.post(serverUrl + "login", {
            type: "client",
            email: email,
            password: pass,
            organization: org
          }).then(function (response) {
            if (response.data == "Invalid")
              Alert.alert("Wrong credentials");
            else {
              navigation.navigate("Home");
            }
          }).catch(function (error) {
            console.log(error);
          })
        }}
      >
        <Text style={styles.LargeTextStyle}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.MainButtonStyle}
        activeOpacity={0.5}
        onPress={() => {
          navigation.navigate("Sign Up");
        }}
      >
        <Text style={styles.LargeTextStyle}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const SignUpPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <TextInput style={styles.Input} placeholder="Organization" />
      <TextInput style={styles.Input} placeholder="First Name" />
      <TextInput style={styles.Input} placeholder="Last Name" />
      <TextInput style={styles.Input} placeholder="Email" />
      <TextInput style={styles.Input} placeholder="Password" />

      <TouchableOpacity
        style={styles.MainButtonStyle}
        activeOpacity={0.5}
        onPress={() => {
          navigation.navigate("Log In");
        }}
      >
        <Text style={styles.LargeTextStyle}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const MainPage = ({ navigation }) => {
  [clockState, setClockState] = useState("Clock In");

  useEffect(() => {
    BleManager.start({showAlert: false});

    bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
    bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan );
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', handleDisconnectedPeripheral );
    bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
          if (result) {
            console.log("Permission is OK");
          } else {
            PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
              if (result) {
                console.log("User accept");
              } else {
                console.log("User refuse");
              }
            });
          }
      });
    }  
    
    return (() => {
      console.log('unmount');
      bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral);
      bleManagerEmitter.removeListener('BleManagerStopScan', handleStopScan );
    })
  }, []);
    
      return (
        <View style={styles.container}>
          <DailyContactsBarChart />

          <View paddingBottom={"10%"} />
          <TouchableOpacity
            style={styles.ExposureButtonStyle}
            activeOpacity={0.5}
            onPress={() => navigation.navigate("Report Exposure")}
            backgroundColor="#D00000"
          >
            <Text style={styles.LargeTextStyle}>Report Exposure</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.MainButtonStyle}
            activeOpacity={0.5}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Text style={styles.LargeTextStyle}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ClockInButtonStyle}
            activeOpacity={0.5}
            onPress={() => {
              if (clockState === "Clock In") {
                setClockState("Clock Out");
                clockedIn = true;
              } else {
                setClockState("Clock In");
                clockedIn = false;
              }
            }}
          >
            <Text style={styles.LargeTextStyle}>{clockState}</Text>
          </TouchableOpacity>

          {/* <StatusBar style="auto" /> */}
        </View>
      );
    };

    const NotificationPage = ({ navigation }) => {
      const [infected, setInfected] = useState(false);
      let bgColor = "#FFFFFF";


      useEffect(() => {
        console.log(email)
        axios.post(serverUrl + "isInfected", {
          email: email
        }).then(function (response) {
          console.log(response.data);
          if (response.data === "ok") {
            Alert.alert("You were exposed to someone infected");
            setInfected(true);
          }
          else {
            Alert.alert("No infection signs");
          }
        }).catch(function (error) {
          console.log(error);
        })
      })
      if (infected)
        bgColor = "#F00000";

      return (
        <View style={{ backgroundColor: bgColor }}>

        </View>
      );
    };

    const ReportPositivePage = ({ navigation }) => {
      return (
        <View style={styles.ReportPage}>
          <Text style={styles.ExposureTextStyle}>
            Confirm to report your exposure
          </Text>

          <TouchableOpacity
            style={styles.ExposureButtonStyle}
            activeOpacity={0.5}
            onPress={() => {
              axios.post(serverUrl + "report", {
                email: email,
                organization: org
              }).then(function (response) {
                if (response.data == "ok") {
                  Alert.alert("Exposure successfully reported");
                }
                else {
                  Alert.alert("There was an error reporting")
                }
              }).catch(function (error) {
                console.log(error);
              })

              navigation.navigate("Home");
            }}
          >
            <Text style={styles.LargeTextStyle}>Confirm</Text>
          </TouchableOpacity>
        </View>
      );
    };

    const data = {
      last5days: [
        { x: "9/13", y: 5 },
        { x: "9/14", y: 7 },
        { x: "9/15", y: 2 },
        { x: "9/16", y: 10 },
        { x: "9/17", y: 7 },
      ],
    };

    const getData = () => {
      //TODO you should really get this data from the database
      return data.last5days; // for now just return the example data
    };

    const DailyContactsBarChart = () => {
      return (
        <View style={styles.DataViewStyle} domainPadding={50}>
          <View paddingTop={13} />
          <Text style={styles.TextStyle}>Contact History Summary</Text>
          <VictoryChart domainPadding={30}>
            <VictoryGroup>
              <VictoryScatter data={getData()} />
            </VictoryGroup>
          </VictoryChart>
        </View>
      );
    };

    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#F0F8FF",
        alignItems: "center",
        justifyContent: "center",
      },

      ReportPage: {
        flex: 1,
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      },

      MainButtonStyle: {
        width: "85%",
        height: 70,
        marginTop: 10,
        paddingTop: 15,
        paddingBottom: 15,
        marginLeft: 30,
        marginRight: 30,
        backgroundColor: "#90A3C0",
        borderRadius: 25,
        justifyContent: "center",
        alignContent: "center",
      },

      ExposureButtonStyle: {
        width: "85%",
        height: 70,
        marginTop: 10,
        paddingTop: 15,
        paddingBottom: 15,
        marginLeft: 30,
        marginRight: 30,
        backgroundColor: "#D00000",
        borderRadius: 25,
        justifyContent: "center",
        alignContent: "center",

      },

      ClockInButtonStyle: {
        width: "85%",
        height: 70,
        marginTop: 10,
        paddingTop: 15,
        paddingBottom: 15,
        marginLeft: 30,
        marginRight: 30,
        backgroundColor: "#00D000",
        borderRadius: 25,
        justifyContent: "center",
        alignContent: "center",
      },

      DataViewStyle: {
        width: "96%",
        height: "45%",
        borderRadius: 25,
        paddingTop: 10,
        backgroundColor: "#B0BED7",
      },

      LargeTextStyle: {
        color: "#fff",
        textAlign: "center",
        fontSize: 27,
      },

      TextStyle: {
        color: "#fff",
        textAlign: "center",
        fontSize: 25,
      },

      ExposureTextStyle: {
        color: "#FF0000",
        textAlign: "center",
        fontSize: 40,
      },

      HeaderStyle: {
        width: "100%",
        height: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },

      Input: {
        color: "black",
        width: "85%",
        height: 40,
        margin: 12,
        borderWidth: 1,
        padding: 10,
        borderRadius: 20,
      },
    });
