
/*
 * created by Rui Santos, https://randomnerdtutorials.com
 * 
 * Complete Guide for Ultrasonic Sensor HC-SR04
 *
    Ultrasonic sensor Pins:
        VCC: +5VDC
        Trig : Trigger (INPUT) - Pin11
        Echo: Echo (OUTPUT) - Pin 12
        GND: GND
 */
 
int trigPin = 11;    // Trigger
int echoPin = 12;    // Echo
long duration, cm, inches;
int trigPin2 = 8;    // Trigger
int echoPin2 = 9;    // Echo
long duration2;
int ledpin1 = 4;
int ledpin2 = 6;
int ledpin3 = 5;
 
void setup() {
  //Serial Port begins
  Serial.begin (9600);
  //Define inputs and outputs
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(trigPin2, OUTPUT);
  pinMode(echoPin2, INPUT);
  pinMode(ledpin1, OUTPUT);
  pinMode(ledpin2, OUTPUT);
  pinMode(ledpin3, OUTPUT);
  digitalWrite(ledpin1, LOW);
  digitalWrite(ledpin2, LOW);
  digitalWrite(ledpin3, LOW);


   //test test test test yrd  test test test
   //Test
   //Hello
   //hello
  //Baiat
  //test
   //no
   //test
   //testr

//Noooo
//TEST
   //test
   //test
   //how test
   //Neat!
   //Test
   //TEst/
   //asdfadsf
   //adfasdfasdfgasd
   //test   
   //TEST
   //TEAST
   //TEST
   //TEST
   //HELLO WORLD
   //HOW ARE YOU TODAY
 
   
}
 
void loop() {
  // The sensor is triggered by a HIGH pulse of 10 or more microseconds.
  // Give a short LOW pulse beforehand to ensure a clean HIGH pulse:
  digitalWrite(trigPin, LOW);
  delayMicroseconds(5);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
 
  // Read the signal from the sensor: a HIGH pulse whose
  // duration is the time (in microseconds) from the sending
  // of the ping to the reception of its echo off of an object.
  pinMode(echoPin, INPUT);
  duration = pulseIn(echoPin, HIGH);


  digitalWrite(trigPin2, LOW);
  delayMicroseconds(5);
  digitalWrite(trigPin2, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin2, LOW);
 
  // Read the signal from the sensor: a HIGH pulse whose
  // duration is the time (in microseconds) from the sending
  // of the ping to the reception of its echo off of an object.
  pinMode(echoPin2, INPUT);
  duration2 = pulseIn(echoPin2, HIGH);

  long dur = (duration + duration2)/2;

  if(duration < (duration2*2) && duration2 < (duration*2)){
    // Convert the time into a distance
    cm = (dur/2) / 29.1;     // Divide by 29.1 or multiply by 0.0343
    inches = (duration/2) / 74;   // Divide by 74 or multiply by 0.0135
    if(cm < 10){
      digitalWrite(ledpin3, HIGH);
      digitalWrite(ledpin2, LOW);
      digitalWrite(ledpin1, LOW);
    }
    else{
      if(cm <20){
        digitalWrite(ledpin3, LOW);
        digitalWrite(ledpin2, HIGH);
        digitalWrite(ledpin1, LOW);
      }

      //TEST
      else{
        if(cm < 40){
          digitalWrite(ledpin3, LOW);
          digitalWrite(ledpin2, LOW);
          digitalWrite(ledpin1, HIGH);
        }
        else{
          digitalWrite(ledpin3, LOW);
          digitalWrite(ledpin2, LOW);
          digitalWrite(ledpin1, LOW);
        }
      }
    }
    
    //  Serial.print(inches);
    //  Serial.print("in, ");
    Serial.println(cm);
    //  Serial.print("cm");
    //  Serial.println();
  }


 


  
  delay(10);
}
