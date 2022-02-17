jQuery('document').ready(() => {
    
    const $ =  jQuery;
    
    const SCSYM = '▖▗▘▝ ▚▞ ▙▛▜▟';
    
    const sym_gen = function*() {
        while(true) {
            yield Symbol();
        }
    };
    
    const [
        
        PR_ELEM,
        PR_AB_SIZE, PR_AB_SLEN,
        PR_AB_TAB,
        
        MTD_NEW_ELEM, MTD_NEW_TAB,
        MTD_GETUNIT, MTD_DIST, MTD_CALC_TAB_SPC,
        
    ] = sym_gen();
    
    class c_board {
        
        constructor(size, len) {
            this[PR_AB_SIZE] = size;
            this[PR_AB_SLEN] = len;
        }
        
        [MTD_NEW_ELEM]() {
            let elem = $('<div>')
                .addClass('ars_board')
                .attr('id', 'ar_board');
            let [mtelem, mtab] = this[MTD_NEW_TAB]('ar_tab_main', this[PR_AB_SIZE]);
            elem.append(mtelem);
            this[PR_AB_TAB] = mtab;
            return elem;
        }
        
        [MTD_NEW_TAB](id, size) {
            let [sw, sh] = size;
            let elem = $('<table>')
                .addClass('ars_tab')
                .attr('id', id);
            let tab = [];
            for(let y = 0; y < sh; y++) {
                let relem = $('<tr>').addClass('ars_row');
                elem.append(relem);
                let row = [];
                tab.push(row);
                for(let x = 0; x < sw; x++) {
                    let celem = $('<td>').addClass('ars_cell')
                    relem.append(celem);
                    let uelem = $('<div>')
                        .addClass('ars_unit');
                    uelem.text('->');
                    celem.append(uelem);
                    row.push(celem);
                }
            }
            return [elem, tab];
        }
        
        get elem() {
            if(!this[PR_ELEM]) {
                this[PR_ELEM] = this[MTD_NEW_ELEM]();
            }
            return this[PR_ELEM];
        }
        
        [MTD_GETUNIT](celem) {
            //return celem.find('.ars_unit');
            return celem.children(0);
        }
        
        [MTD_DIST](e1, e2) {
            if(!e1 || !e2) {
                return [0, 0];
            }
            let {left: left1, top: top1} = e1.offset();
            let {left: left2, top: top2} = e2.offset();
            console.log('dist', left2, left1, top2, top1);
            return [left2 - left1, top2 - top1];
        }
        
        [MTD_CALC_TAB_SPC](tab) {
            let wspc = 0,
                hspc = 0;
            let sc = tab[0][0];
            if(!sc) {
                return [wspc, hspc];
            }
            let dc = tab[0][1];
            if(dc) {
                wspc = this[MTD_DIST](
                    this[MTD_GETUNIT](sc),
                    this[MTD_GETUNIT](dc),
                )[0];
            }
            dc = tab[1][0];
            if(dc) {
                hspc = this[MTD_DIST](
                    this[MTD_GETUNIT](sc),
                    this[MTD_GETUNIT](dc),
                )[1];
            }
            console.log('spc', wspc, hspc);
            return [wspc, hspc];
        }
        
        [MTD_LOCK]() {
            if(this[FLG_BUSY]) {
                throw Error('be locked');
            }
            this[FLG_BUSY] = true;
        }
        
        [MTD_UNLOCK]() {
            this[FLG_BUSY] = false;
        }
        
        async popanim_slide(spos, doffs) {
            this[MTD_LOCK]();
            let [sx, sy] = spos;
            let celem = this[PR_AB_TAB][sy][sx];
            let uelem = this[MTD_GETUNIT](celem);
            let [cw, ch] = this[MTD_CALC_TAB_SPC](this[PR_AB_TAB]);
            let dx = cw * doffs[0];
            let dy = ch * doffs[1];
            await uelem.animate({
                left: '+=' + dx,
                top: '+=' + dy,
            }).promise();
            this[MTD_UNLOCK]();
        }
        
    }
    
    const scene = $('<div>').addClass('ars_scene');
    /*const*/ board = new c_board([3, 5]);
    scene.append(board.elem);
    $('body').append(scene);
    
});