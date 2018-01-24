import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text
} from 'react-native';

import Avatar from './Avatar';
import Bubble from './Bubble';
import Day from './Day';

import {isSameUser, isSameDay} from './utils';

import PropTypes from 'prop-types'

//Localization
import { strings } from '../../../components/localization/strings'
var Spinner = require('react-native-spinkit');

export default class Message extends React.Component {

    constructor(props) {
        super(props);
        this.state = {

        };
        this.onPressResend = this.onPressResend.bind(this);
    }

  getInnerComponentProps() {
    const {containerStyle, ...props} = this.props;
    return {
      ...props,
      isSameUser,
      isSameDay
    }
  }

  renderDay() {
    if (this.props.currentMessage.createdAt) {
      const dayProps = this.getInnerComponentProps();
      if (this.props.renderDay) {
        return this.props.renderDay(dayProps);
      }
      return <Day {...dayProps}/>;
    }
    return null;
  }

  renderBubble() {
    const bubbleProps = this.getInnerComponentProps();
    if (this.props.renderBubble) {
      return this.props.renderBubble(bubbleProps);
    }
    return <Bubble {...bubbleProps}/>;
  }

  renderAvatar() {
    if (this.props.user._id !== this.props.currentMessage.user._id) {
      const avatarProps = this.getInnerComponentProps();
      return <Avatar {...avatarProps}/>;
    }
    return null;
  }

  onPressResend() {
    if (this.props.onPressResend) {
      this.props.onPressResend(this.context, this.props.currentMessage);
    } else {
      if (this.props.currentMessage.text) {
        const options = [
          strings.Retry,
          strings.Cancel,
        ];
        const cancelButtonIndex = options.length - 1;
        this.context.actionSheet().showActionSheetWithOptions({
          options,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              if(this.props.onResendMessage != null) {
                this.props.onResendMessage(this.props.currentMessage)
              }
          }
        });
      }
    }
  }

  render() {
    return (
      <View>
        {this.renderDay()}
        { this.props.currentMessage.error &&
            <View style={{ position: 'absolute', backgroundColor: 'transparent', zIndex: 999999, justifyContent: 'center', alignItems: 'center', width: '20%', height: '100%' }}>

                { !this.props.isResending &&
                    <TouchableOpacity
                        style={{flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}
                        onPress={this.onPressResend}>
                        <Image
                            style={{width: 25, resizeMode: 'contain'}}
                            source={require('../images/exclamation.png')}></Image>
                    </TouchableOpacity>
                }

                { this.props.isResending &&
                    <Spinner color={'#0097ff'} type="Circle"/>
                }
            </View>
        }

        <Text style={{ height: 0 }}></Text>
        <View style={[styles[this.props.position].container, {
          marginBottom: isSameUser(this.props.currentMessage, this.props.nextMessage) ? 2 : 10,
        }, this.props.containerStyle[this.props.position]]}>
          {this.props.position === 'left' ? this.renderAvatar() : null}
          {this.renderBubble()}
          {this.props.position === 'right' ? this.renderAvatar() : null}
        </View>
      </View>
    );
  }
}

const styles = {
  left: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      marginLeft: 8,
      marginRight: 0,
    },
  }),
  right: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      marginLeft: 0,
      marginRight: 8,
    },
  }),
};

Message.defaultProps = {
  renderAvatar: undefined,
  renderBubble: null,
  renderDay: null,
  position: 'left',
  currentMessage: {},
  nextMessage: {},
  previousMessage: {},
  user: {},
  containerStyle: {},
};

Message.contextTypes = {
  actionSheet: PropTypes.func,
};

Message.propTypes = {
  renderAvatar: PropTypes.func,
  renderBubble: PropTypes.func,
  renderDay: PropTypes.func,
  position: PropTypes.oneOf(['left', 'right']),
  currentMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  previousMessage: PropTypes.object,
  user: PropTypes.object,
  containerStyle: PropTypes.shape({
    left: View.propTypes.style,
    right: View.propTypes.style,
  }),
};
