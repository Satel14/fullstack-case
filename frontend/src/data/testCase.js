const cases = [
    {
        name: 'Case Prime',
        id: 1,
        price: 300,
        img: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU1nfbOIj8W7oWzkYLdlPOsMOmIk2kGscAj2erE99Sn2AGw_0M4NW2hIYOLMlhpcmY0CRM/256fx198f',
        items: [
            {
                itemId: 1,
                name: 'Food chain',
                type: 'pp',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou6r8FAR17P7YKAJE49Oyq4ODlv76DLfYkWNFppAp07zHoY_20ALg-EtrMm_ydYWSegU6ZljQ-Vbrx7u7hJ-5v8vOnSR9-n51oTWxmVM/140fx105f/image.png',
            },
            {
                itemId: 2,
                name: 'Flashback',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDL3dl3hZ6sRygdbM8Ij8nVn6r0FtN2-gJteVIFJoNF6E_1O4k-rthMO66J3InHdhviBx7X2LnhaxhwYMMLKHMI1gQw/140fx105f/image.png',
            },
            {
                itemId: 3,
                name: 'Redline',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz56P7fiDzRyTQXJVfdhX_o45gnTBCI24dJuGtay8-MEew_n4YCTNOMuNNhLF8GDU6KDNFipvEg-gfRfLp2PpXi82Hz3ejBdOj7r2Ww/140fx105f/image.png',
            },
            {
                itemId: 4,
                name: 'Asiimov',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV092lnYmGmOHLP7LWnn8fvpMkjOqS99Smiwzk_0VvamH0LIHEdwFqYw2G_QC3lefsjZS4uJXLyWwj5HclxVTx0A/140fx105f/image.png',
            },
            {
                itemId: 5,
                name: 'Desolate Space',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09izh4-HluPxDKjBl2hU18h0juDU-MKt0Fex-kpkMTumJobEdlU7ZFCF-AO4wOnv0Mft752azyRh7CZ2ty2MgVXp1k8SoycS/140fx105f/image.png',
            },
            {
                itemId: 6,
                name: 'Neo-Noir',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09Kzm7-FmP7mDLfYkWNFpsch2evFo9Wl2lflr0RtZzilJNTBdgE3ZAyDr1nrx-vs0cK9vsmamnt9-n51UgTl8ms/140fx105f/image.png',
            },
            {
                itemId: 7,
                name: 'Player Two',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITShWxeupUl0tbN_Iv9nBri_kBtYWv2d9eXcAI6YF6ErFXqkui-1Je-75ucmicyvyggt36InhS3n1gSOc6J6LtH/140fx105f/image.png',
            },
            {
                itemId: 8,
                name: 'Neon Revolution',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV0924lZKIn-7LPr7Vn35cppwl3OyVp9Txi1Gy_0Y9MDjyd4fGJFVsZFGG-gC5xLvo1pfouJ3Bzyd9-n51-K95osI/140fx105f/image.png',
            },
            {
                itemId: 9,
                name: 'Legion of Anubis',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV0924gYKChMj4OrzZgiUGv5wo3uuY8dr02lLn-0FsMGmgIdfEelU3Ml-G_VG9xOm7gZC87suf1zI97aiJAbeK/140fx105f/image.png',
            },
            {
                itemId: 10,
                name: 'Magnesium',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhnwMzFJTwW09--m5CbkuXLNLPehX9u5Mx2gv2Pptuh0QXnrxJoamvwJ4SXcVJrZQuB-wfowee-h5bv75-YziNqviIq7WGdwULQRBs-zw/140fx105f/image.png',
            },
            {
                itemId: 11,
                name: 'Bullet Rain',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz52YOLkDzRyTQbXDaxbSMoo9QHiNipm6ZZcWdKy_q4LZ13mt4LBNOYvMtlOHpWDXvePNVuv4ks6gfBcKJfco3zt2yy_OT8CDRH1ujVTbUp_gdk/140fx105f/image.png',
            },
            {
                itemId: 12,
                name: 'Hyper Beast',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZYMUrsm1j-9xgEObwgfEh_nvjlWhNzZCveCDfIBj98xqodQ2CZknz52YOLkDyRufgHMAqVMY_YvywW4CHYN4N5zUcWJ9b4HOkiA6deSavVxLt0aG5GCCKDQMgn-4kMxgaVYJ5CA9iO-3y-9OT8JDUXirD4GneXT6LJ1wjFBrFMBOCI/140fx105f/image.png',
            },
            {
                itemId: 13,
                name: 'In Living Color',
                type: 'assaultrifles',
                rare: 'classified',
                chance: 4,
                painted: 'default',
                img:
              'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09C5goW0m_7zO6-fw20G7pNw2bmZoI3wjFflqktraz2nJYadegc_ZVyF_Vm3yb_t0cS_6IOJlyXmINWx1g/140fx105f/image.png',
            },
        ],
    },
];

export default cases;
