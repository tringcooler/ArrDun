// Algorithm from https://stackoverflow.com/a/47593316/4450727

var PRNG = (function() {
    
    function xmur3(str) {
        for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
            h = h << 13 | h >>> 19;
        } return function() {
            h = Math.imul(h ^ (h >>> 16), 2246822507);
            h = Math.imul(h ^ (h >>> 13), 3266489909);
            return (h ^= h >>> 16) >>> 0;
        }
    }
    
    var prngs = {
        
        sfc32_argnum: 4,
        sfc32: function (a, b, c, d) {
            return function() {
              a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
              var t = (a + b) | 0;
              a = b ^ b >>> 9;
              b = c + (c << 3) | 0;
              c = (c << 21 | c >>> 11);
              d = d + 1 | 0;
              t = t + d | 0;
              c = c + t | 0;
              return (t >>> 0) / 4294967296;
            }
        },
        
        mulberry32_argnum: 1,
        mulberry32: function (a) {
            return function() {
              var t = a += 0x6D2B79F5;
              t = Math.imul(t ^ t >>> 15, t | 1);
              t ^= t + Math.imul(t ^ t >>> 7, t | 61);
              return ((t ^ t >>> 14) >>> 0) / 4294967296;
            }
        },
        
        xoshiro128ss_argnum: 4,
        xoshiro128ss: function (a, b, c, d) {
            return function() {
                var t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
                c ^= a; d ^= b;
                b ^= c; a ^= d; c ^= t;
                d = d << 11 | d >>> 21;
                return (r >>> 0) / 4294967296;
            }
        },
        
        jsf32_argnum: 4,
        jsf32: function jsf32(a, b, c, d) {
            return function() {
                a |= 0; b |= 0; c |= 0; d |= 0;
                var t = a - (b << 27 | b >>> 5) | 0;
                a = b ^ (c << 17 | c >>> 15);
                b = c + d | 0;
                c = d + t | 0;
                d = a + t | 0;
                return (d >>> 0) / 4294967296;
            }
        },
        
    };
    
    return function(seedstr, algo) {
        if(!(algo in prngs)) {
            algo = 'mulberry32';
        }
        var seed = xmur3(seedstr);
        var prng = prngs[algo];
        switch(prngs[algo + '_argnum']) {
            case 1:
                return prng(seed());
            case 4:
                return prng(seed(), seed(), seed(), seed());
            default:
                return null;
        }
    };
    
})();