import React from 'react';
import { RNodeType } from './model';

const COLORS = 256;
export const WC_PRECALCULATED_CLASSES = 300;

var __fc = new Array(COLORS); // foreground color
var __bc = new Array(COLORS); // background color
var __uc = new Array(COLORS); // underline color
var __b = 'b'; // bold
var __i = 'i'; // italic
var __blink = 'blink-node';
var __u = 'u'; // underline
var __s = 's'; // strikethrough
var __us = 'us'; // underline and strikethrough
var __uu = {
  solid: 'u1',
  double: 'u2',
  wavy: 'u3',
  dotted: 'u4',
  dashed: 'u5',
}; // underline

for (var i = 0; i < COLORS; i++) {
  __fc[i] = 'c' + i;
  __bc[i] = 'bc' + i;
  __uc[i] = 'uc' + i;
}

type PropsType = {
  node: RNodeType,
};

// https://medium.com/reactnative/emojis-in-javascript-f693d0eb79fb
const _emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;

export default class RNode extends React.Component<PropsType> {
  _v: number = -1;

  render() {
    const node = this.props.node;
    const attrs = node.attrs;
    this._v = node.v;

    // Fast path
    if (attrs.isDefault) {
      return node.txt;
    }

    let classes = [];
    // if colors < 256 we have them in className
    // otherwise set them with style
    var style: React.CSSProperties | null = null;
    if (attrs.fci >= 0) {
      classes.push(__fc[attrs.fci]);
    } else if (attrs.fcs !== undefined) {
      style = style || {};
      style.color = attrs.fcs;
    }
    if (attrs.bci >= 0) {
      classes.push(__bc[attrs.bci]);
    } else if (attrs.bcs !== undefined) {
      style = style || {};
      style.backgroundColor = attrs.bcs;
    }
    if (attrs.uci >= 0) {
      classes.push(__uc[attrs.uci]);
    } else if (attrs.ucs !== undefined) {
      style = style || {};
      style.textDecorationColor = attrs.ucs;
    }

    if (attrs.bold) {
      classes.push(__b);
    }

    if (attrs.italic) {
      classes.push(__i);
    }

    if (attrs.blink) {
      classes.push(__blink);
    }

    if (attrs.underline) {
      if (attrs.strikethrough) {
        classes.push(__us);
      } else {
        classes.push(__u);
      }
      // @ts-ignore
      classes.push(__uu[attrs.underline]);
    } else if (attrs.strikethrough) {
      classes.push(__s);
    }

    if (!attrs.asciiNode) {
      if (attrs.wcNode) {
        if (_emojiRegex.test(node.txt)) {
          classes.push('wc wc-node emoji');
        } else {
          classes.push('wc wc-node');
        }
      } else if (node.wcw < WC_PRECALCULATED_CLASSES) {
        classes.push('wc wc' + node.wcw);
      } else {
        classes.push('wc');

        style = style || {};
        style.width = 'calc(var(--hterm-charsize-width) * ' + node.wcw + ')';
      }
    }

    const props: { style?: any, className?: string } = {};
    if (classes.length) {
      props.className = classes.join(' ');
    }
    if (style) {
      props.style = style;
    }

    return React.createElement('span', props, node.txt);
  }

  shouldComponentUpdate(nextProps: PropsType) {
    return this._v !== nextProps.node.v;
  }
}
