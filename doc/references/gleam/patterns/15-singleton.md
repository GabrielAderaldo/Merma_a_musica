# Episode 15: Singleton

Episode 15: Singleton
Feverro O’Neal complains that we have a lot of different styles for UI.
Force one per application UI configuration.
Pedro: But wait, there was requirement to save UI style per user.
Eve: Probably it was changed.
Pedro: Ok, then we should just save configuration to Singleton and use it from all the
places.
public final class UIConfiguration {
public static final UIConfiguration INSTANCE = new UIConfiguration("ui.config");
private String backgroundStyle;
private String fontStyle;
/* other UI properties */
private UIConfiguration(String configFile) {
loadConfig(configFile);
}
private static void loadConfig(String file) {
// process file and fill UI properties
INSTANCE.backgroundStyle = "black";
INSTANCE.fontStyle = "Arial";
}
public String getBackgroundStyle() {
return backgroundStyle;
}
public String getFontStyle() {
return fontStyle;
}
}
Pedro: That way all configuration will be shared across the UIs.
Eve: Yes, but…why so much code?
Pedro: We guarantee that only one instance of UIConfiguration will exist.
Eve: Let me ask you: what’s the difference between singleton and global varaible.
Pedro: What?
Eve: …the difference between singleton and global variable.
Pedro: Java does not support global variables.
Eve: But UIConfiguration.INSTANCE is global variable.
Pedro: Well, sort of.
Eve: Your code is just simple def in clojure.
(def ui-config (load-config "ui.config"))
(defn load-config [config-file]
;; process config file and return map with configuratios
{:bg-style "black" :font-style "Arial"})
Pedro: But, how do you change the style?
Eve: The same way you will change it in your code.
Pedro: Uhm… Ok, we need a simple tweak. Make UIConfiguration.loadConfig is
public and call it when the configuration changes.
Eve: Then we make ui-config an atom and call swap! when configuration changes.
Pedro: But atoms are useful only in concurrent environment.
Eve: First, yes, they useful, but NOT only in concurrent environment. Second, atom read is not
as slow as you think. Third, it changes the state of UI configuration atomically
Pedro: It is redundant for such simple example.
Eve: No, it is not. There is a posibility that UI configuration changes and some renders read new
backgroundStyle, but old fontStyle
Pedro: Ok, use synchronized for loadConfig
Eve: Then you must use synchonized on getters as well, it is slow.
Pedro: There is still Double-Checked Locking idiom
Eve: Double-checked locking is clever but broken
Pedro: Ok, I give up, you won.
