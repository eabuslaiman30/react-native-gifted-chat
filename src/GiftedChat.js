import React from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  Image,
  PanResponder,
  Dimensions
} from 'react-native';

import ActionSheet from '@expo/react-native-action-sheet';
import moment from 'moment/min/moment-with-locales.min';
import uuid from 'uuid';
import PropTypes from 'prop-types'

import * as utils from './utils';
import Actions from './Actions';
import Avatar from './Avatar';
import Bubble from './Bubble';
import MessageImage from './MessageImage';
import MessageText from './MessageText';
import Composer from './Composer';
import Day from './Day';
import InputToolbar from './InputToolbar';
import LoadEarlier from './LoadEarlier';
import Message from './Message';
import MessageContainer from './MessageContainer';
import Send from './Send';
import Time from './Time';
import GiftedAvatar from './GiftedAvatar';
import GiftedChatInteractionManager from './GiftedChatInteractionManager';

// Min and max heights of ToolbarInput and Composer
// Needed for Composer auto grow and ScrollView animation
// TODO move these values to Constants.js (also with used colors #b2b2b2)
const MIN_COMPOSER_HEIGHT = Platform.select({
  ios: 33,
  android: 41,
});
const MAX_COMPOSER_HEIGHT = 100;
var {height, width} = Dimensions.get('window');
var START_POSITION_CALL_TO_TEACHER_BUTTON = { x : width - 60, y: 15 }

class GiftedChat extends React.Component {
  constructor(props) {
    super(props);

    // default values
    this._isMounted = false;
    this._keyboardHeight = 0;
    this._bottomOffset = 0;
    this._maxHeight = null;
    this._isFirstLayout = true;
    this._locale = 'en';
    this._messages = [];

    this.state = {
      isInitialized: false, // initialization will calculate maxHeight before rendering the chat
      composerHeight: MIN_COMPOSER_HEIGHT,
      messagesContainerHeight: null,
      typingDisabled: false,
      pan: new Animated.ValueXY(START_POSITION_CALL_TO_TEACHER_BUTTON),
      scale: new Animated.Value(1),
      layoutWidth: width,
      layoutHeight: height,
      disableKeyboardListeners: false
    };

    this.onKeyboardWillShow = this.onKeyboardWillShow.bind(this);
    this.onKeyboardWillHide = this.onKeyboardWillHide.bind(this);
    this.onKeyboardDidShow = this.onKeyboardDidShow.bind(this);
    this.onKeyboardDidHide = this.onKeyboardDidHide.bind(this);
    this.resetPanState = this.resetPanState.bind(this);
    this.onSend = this.onSend.bind(this);
    this.getLocale = this.getLocale.bind(this);
    this.onInputSizeChanged = this.onInputSizeChanged.bind(this);
    this.onInputTextChanged = this.onInputTextChanged.bind(this);
    this.onMainViewLayout = this.onMainViewLayout.bind(this);
    this.onInitialLayoutViewLayout = this.onInitialLayoutViewLayout.bind(this);


    this.invertibleScrollViewProps = {
      inverted: true,
      keyboardShouldPersistTaps: this.props.keyboardShouldPersistTaps,
      onKeyboardWillShow: this.onKeyboardWillShow,
      onKeyboardWillHide: this.onKeyboardWillHide,
      onKeyboardDidShow: this.onKeyboardDidShow,
      onKeyboardDidHide: this.onKeyboardDidHide,
    };
  }

  static append(currentMessages = [], messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }
    return messages.concat(currentMessages);
  }

  static prepend(currentMessages = [], messages) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }
    return currentMessages.concat(messages);
  }

  getChildContext() {
    return {
      actionSheet: () => this._actionSheetRef,
      getLocale: this.getLocale,
    };
  }

  resetPanState() {
    this.state.pan.setOffset({x: 0, y: 0});
    this.state.pan.setValue(START_POSITION_CALL_TO_TEACHER_BUTTON);
  }

  enableKeyboardListeners() {
    this.setState({ disableKeyboardListeners: false })
  }

  disableKeyboardListeners() {
    this.setState({ disableKeyboardListeners: true })
    console.log(this.textInput);
    this.textInput.blur();
  }

  componentWillMount() {
    this.setIsMounted(true);
    this.initLocale();
    this.initMessages(this.props.messages);
    this._panResponder = PanResponder.create({
        onMoveShouldSetResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
            let shouldMove = gestureState.dx != 0 && gestureState.dy != 0;
            return shouldMove;
        },

        onPanResponderGrant: (e, gestureState) => {
            // Set the initial value to the current state
            this.state.pan.setOffset({x: this.state.pan.x._value, y: this.state.pan.y._value});
            this.state.pan.setValue({x: 0, y: 0});
            Animated.spring(
                this.state.scale,
                { toValue: 1.25, friction: 3 }
            ).start();
        },

        onPanResponderMove: Animated.event([
            null, {dx: this.state.pan.x, dy: this.state.pan.y},
        ]),

        onPanResponderRelease: (e, {vx, vy}) => {
            /** if(e.nativeEvent.pageX < 15 || e.nativeEvent.pageY < 15 || e.nativeEvent.pageY > (this.state.layoutHeight - 15) || e.nativeEvent.pageX > (this.state.layoutWidth - 15)) {
                this.resetPanState();
            } **/

            //80 is the width for the image, 70 is the height.
            if(e.nativeEvent.pageX > 70 && e.nativeEvent.pageX < (width - 70)) {

                if(e.nativeEvent.pageX < (this.state.layoutWidth / 2)) {
                    //Force to align the element in the same Y axius but in the right.
                    this.state.pan.setOffset({x: 0, y: 0});
                    this.state.pan.setValue({ x: 0, y: e.nativeEvent.pageY - 30 });
                } else {
                    this.state.pan.setOffset({x: 0, y: 0});
                    this.state.pan.setValue({ x: this.state.layoutWidth - 60, y: e.nativeEvent.pageY - 30 });
                }

            }

            if(e.nativeEvent.pageY < 15 || e.nativeEvent.pageY > (this.state.layoutHeight - 15)) {
                //Force to align the element in the same Y axius but in the right.
                this.state.pan.setOffset({x: 0, y: 0});
                this.state.pan.setValue({ x: this.state.layoutWidth - 60, y: 15 });
            }

            // Flatten the offset to avoid erratic behavior
            this.state.pan.flattenOffset();
            Animated.spring(
                this.state.scale,
                { toValue: 1, friction: 3 }
            ).start();
        }
    });
  }

  componentWillUnmount() {
    this.setIsMounted(false);
  }

  componentWillReceiveProps(nextProps = {}) {
    this.initMessages(nextProps.messages);
  }

  initLocale() {
    if (this.props.locale === null || moment.locales().indexOf(this.props.locale) === -1) {
      this.setLocale('en');
    } else {
      this.setLocale(this.props.locale);
    }
  }

  initMessages(messages = []) {
    this.setMessages(messages);
  }

  setLocale(locale) {
    this._locale = locale;
  }

  getLocale() {
    return this._locale;
  }

  setMessages(messages) {
    this._messages = messages;
  }

  getMessages() {
    return this._messages;
  }

  setMaxHeight(height) {
    this._maxHeight = height;
  }

  getMaxHeight() {
    return this._maxHeight;
  }

  setKeyboardHeight(height) {
    this._keyboardHeight = height;
  }

  getKeyboardHeight() {
    if (Platform.OS === 'android') {
      // For android: on-screen keyboard resized main container and has own height.
      // @see https://developer.android.com/training/keyboard-input/visibility.html
      // So for calculate the messages container height ignore keyboard height.
      return 0;
    } else {
      return this._keyboardHeight;
    }
  }

  setBottomOffset(value) {
    this._bottomOffset = value;
  }

  getBottomOffset() {
    return this._bottomOffset;
  }

  setIsFirstLayout(value) {
    this._isFirstLayout = value;
  }

  getIsFirstLayout() {
    return this._isFirstLayout;
  }

  setIsTypingDisabled(value) {
    this.setState({
      typingDisabled: value
    });
  }

  getIsTypingDisabled() {
    return this.state.typingDisabled;
  }

  setIsMounted(value) {
    this._isMounted = value;
  }

  getIsMounted() {
    return this._isMounted;
  }

  // TODO
  // setMinInputToolbarHeight
  getMinInputToolbarHeight() {
    return this.props.renderAccessory ? this.props.minInputToolbarHeight * 2 : this.props.minInputToolbarHeight;
  }

  calculateInputToolbarHeight(composerHeight) {
    return composerHeight + (this.getMinInputToolbarHeight() - MIN_COMPOSER_HEIGHT);
  }

  /**
   * Returns the height, based on current window size, without taking the keyboard into account.
   */
  getBasicMessagesContainerHeight(composerHeight = this.state.composerHeight) {
    return this.getMaxHeight() - this.calculateInputToolbarHeight(composerHeight);
  }

  /**
   * Returns the height, based on current window size, taking the keyboard into account.
   */
  getMessagesContainerHeightWithKeyboard(composerHeight = this.state.composerHeight) {
    return this.getBasicMessagesContainerHeight(composerHeight) - this.getKeyboardHeight() + this.getBottomOffset();
  }

  prepareMessagesContainerHeight(value) {
    if (this.props.isAnimated === true) {
      return new Animated.Value(value);
    }
    return value;
  }

  onKeyboardWillShow(e) {

    //Icon call to teacher in the normal position
    this.resetPanState();

    this.setIsTypingDisabled(true);
    this.setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : e.end.height);
    this.setBottomOffset(this.props.bottomOffset);
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard();
    if (this.props.isAnimated === true) {
      Animated.timing(this.state.messagesContainerHeight, {
        toValue: newMessagesContainerHeight,
        duration: 210,
      }).start();
    } else {
      this.setState({
        messagesContainerHeight: newMessagesContainerHeight,
      });
    }
  }

  onKeyboardWillHide() {
    this.setIsTypingDisabled(true);
    this.setKeyboardHeight(0);
    this.setBottomOffset(0);
    const newMessagesContainerHeight = this.getBasicMessagesContainerHeight();
    if (this.props.isAnimated === true) {
      Animated.timing(this.state.messagesContainerHeight, {
        toValue: newMessagesContainerHeight,
        duration: 210,
      }).start();
    } else {
      this.setState({
        messagesContainerHeight: newMessagesContainerHeight,
      });
    }
  }

  onKeyboardDidShow(e) {
    if (Platform.OS === 'android') {
      this.onKeyboardWillShow(e);
    }
    this.setIsTypingDisabled(false);
  }

  onKeyboardDidHide(e) {
    if (Platform.OS === 'android') {
      this.onKeyboardWillHide(e);
    }
    this.setIsTypingDisabled(false);
  }

  scrollToBottom(animated = true) {
    if (this._messageContainerRef === null) { return }
    this._messageContainerRef.scrollTo({
      y: 0,
      animated,
    });
  }

  renderMessages() {
    const AnimatedView = this.props.isAnimated === true ? Animated.View : View;
    return (
      <AnimatedView style={{
        height: this.state.messagesContainerHeight,
      }}>
        <MessageContainer
          {...this.props}

          invertibleScrollViewProps={this.invertibleScrollViewProps}

          messages={this.getMessages()}

          ref={component => this._messageContainerRef = component}
        />
        {this.renderChatFooter()}
      </AnimatedView>
    );
  }

  onSend(messages = [], shouldResetInputToolbar = false) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }

    messages = messages.map((message) => {
      return {
        ...message,
        user: this.props.user,
        createdAt: new Date(),
        _id: this.props.messageIdGenerator(),
      };
    });

    if (shouldResetInputToolbar === true) {
      this.setIsTypingDisabled(true);
      this.resetInputToolbar();
    }

    this.props.onSend(messages);
    this.scrollToBottom();

    if (shouldResetInputToolbar === true) {
      setTimeout(() => {
        if (this.getIsMounted() === true) {
          this.setIsTypingDisabled(false);
        }
      }, 100);
    }
  }

  resetInputToolbar() {
    if (this.textInput) {
      this.textInput.clear();
    }
    const newComposerHeight = MIN_COMPOSER_HEIGHT;
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight);
    this.setState({
      text: '',
      composerHeight: newComposerHeight,
      messagesContainerHeight: this.prepareMessagesContainerHeight(newMessagesContainerHeight),
    });
  }

  onInputSizeChanged(size) {
    const newComposerHeight = Math.max(MIN_COMPOSER_HEIGHT, Math.min(MAX_COMPOSER_HEIGHT, size.height));
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight);
    this.setState({
      composerHeight: newComposerHeight,
      messagesContainerHeight: this.prepareMessagesContainerHeight(newMessagesContainerHeight),
    });
  }

  onInputTextChanged(text) {
    if (this.getIsTypingDisabled()) {
      return;
    }
    if (this.props.onInputTextChanged) {
      this.props.onInputTextChanged(text);
    }
    this.setState({text});
  }

  onInitialLayoutViewLayout(e) {
    const layout = e.nativeEvent.layout;
    if (layout.height <= 0) {
      return;
    }
    this.setMaxHeight(layout.height);
    const newComposerHeight = MIN_COMPOSER_HEIGHT;
    const newMessagesContainerHeight = this.getMessagesContainerHeightWithKeyboard(newComposerHeight);
    this.setState({
      isInitialized: true,
      text: '',
      composerHeight: newComposerHeight,
      messagesContainerHeight: this.prepareMessagesContainerHeight(newMessagesContainerHeight),
    });
  }

  onMainViewLayout(e) {
    // fix an issue when keyboard is dismissing during the initialization
    const layout = e.nativeEvent.layout;
    if(layout.width != null) {
        START_POSITION_CALL_TO_TEACHER_BUTTON = {x: layout.width - 60, y: 15 }
        this.resetPanState();
    }

    this.setState({
        layoutWidth: layout.width,
        layoutHeight: layout.height
    });

    if(!this.state.disableKeyboardListeners) {
        if (this.getMaxHeight() !== layout.height || this.getIsFirstLayout() === true) {
          this.setMaxHeight(layout.height);
          this.setState({
            messagesContainerHeight: this.prepareMessagesContainerHeight(this.getBasicMessagesContainerHeight()),
          });
        }
        if (this.getIsFirstLayout() === true) {
          this.setIsFirstLayout(false);
        }
    }
  }

  renderInputToolbar() {
    const inputToolbarProps = {
      ...this.props,
      text: this.state.text,
      composerHeight: Math.max(MIN_COMPOSER_HEIGHT, this.state.composerHeight),
      onSend: this.onSend,
      onInputSizeChanged: this.onInputSizeChanged,
      onTextChanged: this.onInputTextChanged,
      textInputProps: {
        ...this.props.textInputProps,
        ref: textInput => this.textInput = textInput,
        maxLength: this.getIsTypingDisabled() ? 0 : this.props.maxInputLength
      }
    };
    if (this.getIsTypingDisabled()) {
      inputToolbarProps.textInputProps.maxLength = 0;
    }
    if (this.props.renderInputToolbar) {
      return this.props.renderInputToolbar(inputToolbarProps);
    }
    return (
      <InputToolbar
        {...inputToolbarProps}
      />
    );
  }

  renderChatFooter() {
    if (this.props.renderChatFooter) {
      const footerProps = {
        ...this.props,
      };
      return this.props.renderChatFooter(footerProps);
    }
    return null;
  }

  renderLoading() {
    if (this.props.renderLoading) {
      return this.props.renderLoading();
    }
    return null;
  }

  render() {

    // Destructure the value of pan from the state
    let { pan } = this.state;
    // Calculate the x and y transform from the pan value
    let [translateX, translateY] = [pan.x, pan.y];
    let rotate = '0deg';
    // Calculate the transform property and set it as a value for our style which we add below to the Animated.View component
    let imageStyle = {zIndex: 999, position: 'absolute', transform: [{translateX}, {translateY}, {rotate}, {scale: this.state.scale}]};

    if (this.state.isInitialized === true) {
      return (
        <ActionSheet ref={component => this._actionSheetRef = component}>
          <View style={styles.container} onLayout={this.onMainViewLayout}>
            {this.renderMessages()}
            {this.renderInputToolbar()}

            { this.props.callToTeacherButtonEnabled &&
                <Animated.View style={imageStyle} {...this._panResponder.panHandlers}>
                    <TouchableHighlight
                        underlayColor={'transparent'}
                        onPress={() => {
                            if(this.props.callToTeacherButtonPressed) {
                                this.props.callToTeacherButtonPressed();
                            }
                        }}>
                        <Image
                            style={{maxWidth: 80}}
                            source={this.props.callToTeacherButtonImage} />
                    </TouchableHighlight>
                </Animated.View>
            }
          </View>
        </ActionSheet>
      );
    }
    return (
      <View style={styles.container} onLayout={this.onInitialLayoutViewLayout}>
        {this.renderLoading()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

GiftedChat.childContextTypes = {
  actionSheet: PropTypes.func,
  getLocale: PropTypes.func,
};

GiftedChat.defaultProps = {
  messages: [],
  onSend: () => {
  },
  loadEarlier: false,
  onLoadEarlier: () => {
  },
  locale: null,
  isAnimated: Platform.select({
    ios: true,
    android: false,
  }),
  keyboardShouldPersistTaps: Platform.select({
    ios: 'never',
    android: 'always',
  }),
  renderAccessory: null,
  renderActions: null,
  renderAvatar: undefined,
  renderBubble: null,
  renderFooter: null,
  renderChatFooter: null,
  renderMessageText: null,
  renderMessageImage: null,
  renderComposer: null,
  renderCustomView: null,
  renderDay: null,
  renderInputToolbar: null,
  renderLoadEarlier: null,
  renderLoading: null,
  renderMessage: null,
  renderSend: null,
  renderTime: null,
  user: {},
  bottomOffset: 0,
  minInputToolbarHeight: 44,
  isLoadingEarlier: false,
  messageIdGenerator: () => uuid.v4(),
  maxInputLength: null
};

GiftedChat.propTypes = {
  messages: PropTypes.array,
  onSend: PropTypes.func,
  onInputTextChanged: PropTypes.func,
  loadEarlier: PropTypes.bool,
  onLoadEarlier: PropTypes.func,
  locale: PropTypes.string,
  isAnimated: PropTypes.bool,
  renderAccessory: PropTypes.func,
  renderActions: PropTypes.func,
  renderAvatar: PropTypes.func,
  renderBubble: PropTypes.func,
  renderFooter: PropTypes.func,
  renderChatFooter: PropTypes.func,
  renderMessageText: PropTypes.func,
  renderMessageImage: PropTypes.func,
  renderComposer: PropTypes.func,
  renderCustomView: PropTypes.func,
  renderDay: PropTypes.func,
  renderInputToolbar: PropTypes.func,
  renderLoadEarlier: PropTypes.func,
  renderLoading: PropTypes.func,
  renderMessage: PropTypes.func,
  renderSend: PropTypes.func,
  renderTime: PropTypes.func,
  user: PropTypes.object,
  bottomOffset: PropTypes.number,
  minInputToolbarHeight: PropTypes.number,
  isLoadingEarlier: PropTypes.bool,
  messageIdGenerator: PropTypes.func,
  keyboardShouldPersistTaps: PropTypes.oneOf(['always', 'never', 'handled']),
};

export {
  GiftedChat,
  Actions,
  Avatar,
  Bubble,
  MessageImage,
  MessageText,
  Composer,
  Day,
  InputToolbar,
  LoadEarlier,
  Message,
  MessageContainer,
  Send,
  Time,
  GiftedAvatar,
  utils
};
